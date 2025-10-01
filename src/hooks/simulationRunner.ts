/**
 * Sequential Simulator for Financial Planning
 * 
 * This simulator processes events day-by-day, handling:
 * - Inflow/outflow events with intervals
 * - Recurring events
 * - Envelope growth (compound interest, appreciation, etc.)
 * - Dynamic envelope balances
 */

import type { Plan, Event, UpdatingEvent, Envelope, Parameter, Schema, SimulationResult } from '../contexts/PlanContext';

// Types for the simulator
interface EnvelopeBalance {
    name: string;
    balance: number;
    envelope: Envelope;
}

interface ProcessedEvent {
    event: Event | UpdatingEvent;
    parentEvent?: Event;
    nextOccurrence: number; // Day when this event next occurs
    interval: number; // Days between occurrences (0 = non-recurring)
}

interface ParameterUpdate {
    eventId: number;
    paramType: string;
    value: number | string;
}

type UpdateCallback = (updates: ParameterUpdate[]) => void;

/**
 * Get parameter value from event by type
 */
function getParameter(event: Event | UpdatingEvent, paramType: string): number | string | undefined {
    const param = event.parameters?.find(p => p.type === paramType);
    return param?.value;
}

/**
 * Check if an event function is enabled
 */
function isEventFunctionEnabled(event: Event | UpdatingEvent, functionType: string): boolean {
    if (!event.event_functions) return true; // Default to enabled if no functions defined

    const func = event.event_functions.find(f => f.type === functionType);
    return func ? func.enabled : true;
}

/**
 * Calculate growth for an envelope for one day
 */
function calculateDailyGrowth(envelope: Envelope, currentBalance: number, dayOfYear: number): number {
    if (currentBalance <= 0) return 0; // No growth on zero or negative balances

    const rate = envelope.rate || 0;

    switch (envelope.growth) {
        case 'None':
            return 0;

        case 'Daily Compound':
            // Daily compound: balance * (1 + rate/365) - balance
            return currentBalance * (rate / 365);

        case 'Monthly Compound':
            // Only apply on first day of month (approximate as every 30.44 days)
            // Check if this is approximately the start of a month
            if (dayOfYear % 30 === 0 || dayOfYear === 0) {
                return currentBalance * (rate / 12);
            }
            return 0;

        case 'Appreciation':
            // Annual appreciation applied daily
            return currentBalance * (rate / 365);

        default:
            return 0;
    }
}

/**
 * Process inflow event: add money to destination envelope
 */
function processInflow(
    event: Event | UpdatingEvent,
    balances: Map<string, EnvelopeBalance>,
    currentDay: number
): void {
    if (!isEventFunctionEnabled(event, 'inflow')) return;

    const amount = Number(getParameter(event, 'amount') || 0);
    const destinationName = String(getParameter(event, 'destination_envelope') || '');

    if (!destinationName || amount <= 0) return;

    const destination = balances.get(destinationName);
    if (destination) {
        destination.balance += amount;
    }
}

/**
 * Process outflow event: remove money from source envelope
 */
function processOutflow(
    event: Event | UpdatingEvent,
    balances: Map<string, EnvelopeBalance>,
    currentDay: number
): void {
    if (!isEventFunctionEnabled(event, 'outflow')) return;

    const amount = Number(getParameter(event, 'amount') || 0);
    const sourceName = String(getParameter(event, 'source_envelope') || '');

    if (!sourceName || amount <= 0) return;

    const source = balances.get(sourceName);
    if (source) {
        source.balance -= amount;
    }
}

/**
 * Process transfer event: move money from source to destination
 */
function processTransfer(
    event: Event | UpdatingEvent,
    balances: Map<string, EnvelopeBalance>,
    currentDay: number
): void {
    const amount = Number(getParameter(event, 'amount') || 0);
    const sourceName = String(getParameter(event, 'source_envelope') || '');
    const destinationName = String(getParameter(event, 'destination_envelope') || '');

    if (!sourceName || !destinationName || amount <= 0) return;

    const source = balances.get(sourceName);
    const destination = balances.get(destinationName);

    if (source && destination) {
        // Check if outflow is enabled
        if (isEventFunctionEnabled(event, 'outflow')) {
            source.balance -= amount;
        }

        // Check if inflow is enabled
        if (isEventFunctionEnabled(event, 'inflow')) {
            destination.balance += amount;
        }
    }
}

/**
 * Process account balance enforcement event
 */
function processAccountBalance(
    event: Event | UpdatingEvent,
    balances: Map<string, EnvelopeBalance>,
    currentDay: number
): void {
    if (!isEventFunctionEnabled(event, 'alter_account_balance')) return;

    // This event can set multiple account balances (account_1, account_2, etc.)
    for (let i = 1; i <= 5; i++) {
        const envelopeName = String(getParameter(event, `account_${i}`) || '');
        const balanceValue = Number(getParameter(event, `account_${i}_balance`) || 0);

        if (envelopeName && balanceValue !== undefined) {
            const envelope = balances.get(envelopeName);
            if (envelope) {
                envelope.balance = balanceValue;
            }
        }
    }
}

/**
 * Process a single event on a specific day
 */
function processEvent(
    event: Event | UpdatingEvent,
    balances: Map<string, EnvelopeBalance>,
    currentDay: number,
    schema: Schema
): void {
    const eventType = event.type;

    // Route to appropriate handler based on event type
    switch (eventType) {
        case 'inflow':
            processInflow(event, balances, currentDay);
            break;

        case 'outflow':
            processOutflow(event, balances, currentDay);
            break;

        case 'transfer_money':
            processTransfer(event, balances, currentDay);
            break;

        case 'account_balance':
            processAccountBalance(event, balances, currentDay);
            break;

        default:
            // For other event types, check if they have inflow/outflow functions
            if (event.event_functions) {
                // Check for transfer-like behavior
                if (isEventFunctionEnabled(event, 'inflow') && getParameter(event, 'destination_envelope')) {
                    processInflow(event, balances, currentDay);
                }
                if (isEventFunctionEnabled(event, 'outflow') && getParameter(event, 'source_envelope')) {
                    processOutflow(event, balances, currentDay);
                }
            }
            break;
    }
}

/**
 * Initialize envelope balances from plan
 */
function initializeEnvelopes(plan: Plan): Map<string, EnvelopeBalance> {
    const balances = new Map<string, EnvelopeBalance>();

    for (const envelope of plan.envelopes) {
        balances.set(envelope.name, {
            name: envelope.name,
            balance: 0, // Start at zero, will be set by account_balance events
            envelope: envelope
        });
    }

    return balances;
}

/**
 * Prepare events for simulation - extract all events with their timings
 */
function prepareEvents(plan: Plan): ProcessedEvent[] {
    const processedEvents: ProcessedEvent[] = [];

    for (const event of plan.events) {
        const startTime = Number(getParameter(event, 'start_time') || 0);
        const interval = event.is_recurring ? Number(getParameter(event, 'interval') || 0) : 0;

        processedEvents.push({
            event,
            nextOccurrence: startTime,
            interval
        });

        // Also process updating events
        if (event.updating_events) {
            for (const updatingEvent of event.updating_events) {
                const updatingStartTime = Number(getParameter(updatingEvent, 'start_time') || 0);
                const updatingInterval = updatingEvent.is_recurring ? Number(getParameter(updatingEvent, 'interval') || 0) : 0;

                processedEvents.push({
                    event: updatingEvent,
                    parentEvent: event,
                    nextOccurrence: updatingStartTime,
                    interval: updatingInterval
                });
            }
        }
    }

    return processedEvents;
}

/**
 * Apply growth to all envelopes for one day
 */
function applyDailyGrowth(balances: Map<string, EnvelopeBalance>, dayOfYear: number): void {
    for (const envelopeBalance of Array.from(balances.values())) {
        const growth = calculateDailyGrowth(
            envelopeBalance.envelope,
            envelopeBalance.balance,
            dayOfYear
        );
        envelopeBalance.balance += growth;
    }
}

/**
 * Calculate net worth from envelope balances
 */
function calculateNetWorth(balances: Map<string, EnvelopeBalance>): {
    netWorth: number;
    parts: Record<string, number>;
    nonNetworthParts: Record<string, number>;
} {
    let netWorth = 0;
    const parts: Record<string, number> = {};
    const nonNetworthParts: Record<string, number> = {};

    for (const [name, envelopeBalance] of Array.from(balances.entries())) {
        const balance = envelopeBalance.balance;

        // Check if this is a non-networth account (like debt tracking)
        if (envelopeBalance.envelope.account_type === 'non_networth') {
            nonNetworthParts[name] = balance;
        } else {
            // Regular networth accounts
            parts[name] = balance;

            // Debt categories should subtract from net worth
            if (envelopeBalance.envelope.category === 'Debt') {
                netWorth -= Math.abs(balance); // Debt reduces net worth
            } else {
                netWorth += balance;
            }
        }
    }

    return { netWorth, parts, nonNetworthParts };
}

/**
 * Main simulation runner - processes day by day
 */
export async function runSimulation(
    plan: Plan,
    schema: Schema,
    startDate: number,
    endDate: number,
    interval: number,
    currentDay: number,
    birthDate: Date,
    updateCallback?: UpdateCallback,
    visibleRange?: { startDate: number; endDate: number }
): Promise<SimulationResult[]> {
    // Initialize data structures
    const balances = initializeEnvelopes(plan);
    const processedEvents = prepareEvents(plan);
    const results: SimulationResult[] = [];

    // Determine simulation range
    const simStart = visibleRange?.startDate ?? startDate;
    const simEnd = visibleRange?.endDate ?? endDate;

    // Track events that need to fire
    const pendingEvents = [...processedEvents];

    // Simulate day by day
    for (let day = simStart; day <= simEnd; day++) {
        // Process all events that should occur on this day
        const eventsToday: ProcessedEvent[] = [];

        for (let i = pendingEvents.length - 1; i >= 0; i--) {
            const processedEvent = pendingEvents[i];

            // Check if this event should fire today
            if (processedEvent.nextOccurrence === day) {
                eventsToday.push(processedEvent);

                // Schedule next occurrence if recurring
                if (processedEvent.interval > 0) {
                    processedEvent.nextOccurrence = day + processedEvent.interval;
                } else {
                    // Remove non-recurring events after they fire
                    pendingEvents.splice(i, 1);
                }
            }
        }

        // Process events in order (they're already sorted by prepareEvents)
        for (const processedEvent of eventsToday) {
            processEvent(processedEvent.event, balances, day, schema);
        }

        // Apply daily growth to all envelopes
        applyDailyGrowth(balances, day);

        // Record snapshot at the specified interval
        if (day % interval === 0 || day === simStart || day === simEnd) {
            const { netWorth, parts, nonNetworthParts } = calculateNetWorth(balances);

            results.push({
                date: day,
                value: netWorth,
                parts: { ...parts },
                nonNetworthParts: Object.keys(nonNetworthParts).length > 0 ? { ...nonNetworthParts } : undefined
            });
        }
    }

    // Ensure we have results at the start and end
    if (results.length === 0 || results[0].date !== simStart) {
        const { netWorth, parts, nonNetworthParts } = calculateNetWorth(balances);
        results.unshift({
            date: simStart,
            value: netWorth,
            parts: { ...parts },
            nonNetworthParts: Object.keys(nonNetworthParts).length > 0 ? { ...nonNetworthParts } : undefined
        });
    }

    return results;
}

/**
 * Helper function to detect accounts with concerning balances
 */
export function detectAccountWarnings(
    results: SimulationResult[],
    plan: Plan
): Array<{ envelopeName: string; date: number; balance: number }> {
    const warnings: Array<{ envelopeName: string; date: number; balance: number }> = [];

    for (const result of results) {
        for (const [envelopeName, balance] of Object.entries(result.parts)) {
            // Find the envelope to check its category
            const envelope = plan.envelopes.find(e => e.name === envelopeName);

            // Warn if non-debt accounts go negative
            if (envelope && envelope.category !== 'Debt' && balance < 0) {
                warnings.push({
                    envelopeName,
                    date: result.date,
                    balance
                });
            }
        }
    }

    return warnings;
}

