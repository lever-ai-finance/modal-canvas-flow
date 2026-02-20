import type { Plan, Schema } from '../contexts/PlanContext';
import type { Datum } from '../visualization/viz_utils';
import { validateProblem, extractSchema, parseEvents } from './schemaChecker';
import type * as AllEventTypes from '../types/generated-types';

type ParameterUpdate = { eventId: number, paramType: string, value: number };

export async function runSimulation(
    plan: Plan,
    schema: Schema,
    startDate: number,
    endDate: number,
    onParameterUpdate?: (updates: ParameterUpdate[]) => void
): Promise<Datum[]> {

    const schemaMap = extractSchema(schema);
    const issues = validateProblem(plan, schemaMap, schema, plan);

    if (issues.length > 0) {
        console.error("❌ Validation issues found:");
        for (const issue of issues) console.error(issue);
        console.log('[runSimulation] Issues:', issues);
    }

    const envelopes: Record<string, any> = {}; //track each envelope balance

    //console.log("plan.envelopes", plan.envelopes);
    for (const env of plan.envelopes) {
        const name = env.name;
        const growth_type = env.growth || "None";
        const rate = env.rate || 0.0;
        const days_of_usefulness = env.days_of_usefulness;
        const inflation_rate = plan.inflation_rate;
        const account_type = env.account_type;
        envelopes[name] = { balance: 0, growth_type, growth_rate: rate, days_of_usefulness, inflation_rate, account_type };
    }

    const results: Datum[] = [];
    const pendingParameterUpdates = new Map<string, ParameterUpdate>();

    const queueParameterUpdate = (update: ParameterUpdate) => {
        pendingParameterUpdates.set(`${update.eventId}:${update.paramType}`, update);
    };

    let day = startDate; // Start simulation on the first day

    const eventList = parseEvents(plan);


    while (day <= endDate) {

        // Apply growth
        applyGrowth(envelopes);

        applyEventsToDay(day, eventList, envelopes, queueParameterUpdate);

        // Take balance from envelopes, add balances and append to results
        const parts: { [key: string]: number } = {};
        const nonNetworthParts: { [key: string]: number } = {};
        let total_networth = 0;
        for (const envelope in envelopes) {
            // set the non networthparts to those envleopes and then for networth parts accumulate total value

            if (envelopes[envelope].account_type === "non-networth-account") {
                nonNetworthParts[envelope] = envelopes[envelope].balance;
            }
            else {
                parts[envelope] = envelopes[envelope].balance;
                total_networth += envelopes[envelope].balance;
            }
        }

        results.push({ date: day, value: total_networth, parts: parts, nonNetworthParts: nonNetworthParts });
        day++; //go to next day
    }

    // After simulation update the parameters that were queued for update
    if (onParameterUpdate && pendingParameterUpdates.size > 0) {
        onParameterUpdate(Array.from(pendingParameterUpdates.values()));
    }

    return results;
}

const applyGrowth = (envelopes: Record<string, any>) => {
    for (const envelope in envelopes) {
        const env = envelopes[envelope];
        const annualRate = env.growth_rate || 0;
        const dailyRate = annualRate / 365;
        env._days_elapsed = (env._days_elapsed ?? 0) + 1;
        switch (env.growth_type) {
            case "None":
                break;
            case "Simple Interest": {
                if (env.balance !== 0 && dailyRate !== 0) {
                    env.balance += env.balance * dailyRate;
                }
                break;
            }
            case "Appreciation": {
                if (env.balance !== 0 && dailyRate !== 0) {
                    env.balance += env.balance * dailyRate;
                }
                break;
            }
            case "Daily Compound": {
                if (env.balance !== 0 && dailyRate !== 0) {
                    env.balance *= (1 + dailyRate);
                }
                break;
            }
            case "Monthly Compound": {
                if (env.balance !== 0 && annualRate !== 0) {
                    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
                    const dailyEquivalentRate = Math.pow(1 + monthlyRate, 12 / 365) - 1;
                    env.balance *= (1 + dailyEquivalentRate);
                }
                break;
            }
            case "Yearly Compound": {
                if (env.balance !== 0 && annualRate !== 0) {
                    const daysPerYear = 365;
                    if (env._days_elapsed % daysPerYear === 0) {
                        env.balance *= (1 + annualRate);
                    }
                }
                break;
            }
            case "Depreciation": {
                if (env.balance !== 0 && dailyRate !== 0) {
                    env.balance -= env.balance * dailyRate;
                }
                break;
            }
            case "Depreciation (Days)": {
                const daysOfUsefulness = Number(env.days_of_usefulness || 0);
                if (daysOfUsefulness > 0) {
                    if (env._depreciation_start_balance == null || env.balance > env._depreciation_start_balance) {
                        env._depreciation_start_balance = env.balance;
                    }
                    const dailyDecrease = env._depreciation_start_balance / daysOfUsefulness;
                    env.balance = Math.max(0, env.balance - dailyDecrease);
                }
                break;
            }
            default:
                break;
        }

    }
}

const applyEventsToDay = (
    day: number,
    eventList: any[],
    envelopes: Record<string, any>,
    onParameterUpdate?: (update: ParameterUpdate) => void
) => {
    for (const event of eventList) {
        // check to see if I should even apply the event
        //console.log("Event Title: ", event.title);
        if (event.parameters.start_time <= day) { // event.paramters.start_date exists
            switch (event.type) {
                case "inflow":
                    applyInflowToDay(day, event, envelopes, onParameterUpdate);
                    break;
                case "outflow":
                    applyOutflowToDay(day, event, envelopes);
                    break;
                case "declare_accounts":
                    declare_accounts(day, event, envelopes);
                    break;
                case "transfer_money":
                    transfer_money(day, event, envelopes);
                    break;
                case "manual_correction":
                    manual_correction(day, event, envelopes);
                    break;
                case "payment_schedule":
                    payment_schedule(day, event, envelopes);
                    break;
                case "get_job":
                    get_job(day, event, envelopes);
                    break;
                case "get_wage_job":
                    get_wage_job(day, event, envelopes);
                    break;
                case "monthly_budgeting":
                    monthly_budgeting(day, event, envelopes);
                    break;
                case "buy_house":
                    buy_house(day, event, envelopes, onParameterUpdate);
                    break;
                case "buy_car":
                    buy_car(day, event, envelopes, onParameterUpdate);
                    break;

                // More event types can be added here
                default:
                    break;
                // More event types can be added here
            }
        }
    }
}

const applyInflowToDay = (day: number, event: any, envelopes: Record<string, any>, onParameterUpdate?: (update: ParameterUpdate) => void) => {
    const params = event.parameters as AllEventTypes.inflowParams;

    if (event.updating_events.length > 0) {
        for (const updating_event of event.updating_events) {
            switch (updating_event.type) {
                case "update_amount": {
                    // update_amount only has start_time and amount - it's a one-time update
                    const uParams = updating_event.parameters as AllEventTypes.inflow_update_amountParams;
                    if (uParams.start_time == day) {
                        params.amount = uParams.amount;
                    }
                    break;
                }
                case "increment_amount": {
                    // increment_amount can be recurring and has frequency_days
                    const uParams = updating_event.parameters as AllEventTypes.inflow_increment_amountParams;
                    if (uParams.start_time == day) {
                        params.amount += uParams.amount;
                    }
                    if (updating_event.is_recurring && day <= uParams.end_time) {
                        if ((day - uParams.start_time) % Math.round(uParams.frequency_days) == 0) {
                            params.amount += uParams.amount;
                        }
                    }
                    break;
                }
                case "additional_inflow": {
                    // additional_inflow adds directly to the envelope, can be recurring
                    const uParams = updating_event.parameters as AllEventTypes.inflow_additional_inflowParams;
                    if (uParams.start_time == day) {
                        envelopes[params.to_key].balance += uParams.amount;
                    }
                    if (updating_event.is_recurring && day <= uParams.end_time) {
                        if ((day - uParams.start_time) % Math.round(uParams.frequency_days) == 0) {
                            envelopes[params.to_key].balance += uParams.amount;
                        }
                    }
                    break;
                }
            }
        }
    }
    if (params.start_time == day) {
        envelopes[params.to_key].balance += params.amount;

        // Set the
    }
    if (event.is_recurring && day <= params.end_time) {
        if ((day - params.start_time) % Math.round(params.frequency_days) == 0) {
            envelopes[params.to_key].balance += params.amount;
        }
    }
}

const applyOutflowToDay = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.outflowParams;

    //check for updating events
    if (event.updating_events.length > 0) {
        for (const updating_event of event.updating_events) {
            switch (updating_event.type) {
                case "update_amount": {
                    const uParams = updating_event.parameters as AllEventTypes.outflow_update_amountParams;
                    if (uParams.start_time == day) {
                        params.amount = uParams.amount;
                    }
                    break;
                }
            }
        }
    }

    //event logic
    if (params.start_time == day) {
        envelopes[params.from_key].balance -= params.amount;
    }
    if (event.is_recurring && day <= params.end_time) {
        if ((day - params.start_time) % Math.round(params.frequency_days) == 0) {
            envelopes[params.from_key].balance -= params.amount;
        }
    }
}

const declare_accounts = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.declare_accountsParams;

    // No updating event logic yet

    //event logic
    if (params.start_time == day) {
        // Set balances of each account to the amount when defined
        const pairs: Array<[string | undefined, number | undefined]> = [
            [params.account1, params.amount1],
            [params.account2, params.amount2],
            [params.account3, params.amount3],
            [params.account4, params.amount4],
            [params.account5, params.amount5]
        ];

        for (const [envelopeKey, amount] of pairs) {
            if (envelopeKey && envelopes[envelopeKey]) {
                envelopes[envelopeKey].balance = amount ?? 0;
            }
        }
    }
}

const transfer_money = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.transfer_moneyParams;

    if (event.updating_events.length > 0) {
        for (const updating_event of event.updating_events) {
            switch (updating_event.type) {
                case "update_amount": {
                    const uParams = updating_event.parameters as AllEventTypes.transfer_money_update_amountParams;
                    if (uParams.start_time == day) {
                        params.amount = uParams.amount;
                    }
                    break;
                }
            }
        }
    }
    if (params.start_time == day) {
        envelopes[params.from_key].balance -= params.amount;
        envelopes[params.to_key].balance += params.amount;
    }
    if (event.is_recurring && day <= params.end_time) {
        if ((day - params.start_time) % Math.round(params.frequency_days) == 0) {
            envelopes[params.from_key].balance -= params.amount;
            envelopes[params.to_key].balance += params.amount;
        }
    }
}

const manual_correction = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.manual_correctionParams;

    if (params.start_time == day) {
        envelopes[params.to_key].balance = params.amount;
    }

}

const calculate_loan_payment = (principal: number, annual_interest_rate: number, term_years: number): number => {
    const monthly_interest_rate = annual_interest_rate / 12 / 100;
    const number_of_payments = term_years * 12;

    const monthly_payment = (principal * monthly_interest_rate) / (1 - Math.pow(1 + monthly_interest_rate, -number_of_payments));
    return monthly_payment;
}

const calculateMortgagePayment = (principal: number, annualRateDecimal: number, termYears: number): number => {
    if (principal <= 0 || termYears <= 0) return 0;
    const monthlyRate = annualRateDecimal / 12;
    const numberOfPayments = termYears * 12;
    if (monthlyRate === 0) return principal / numberOfPayments;
    return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
}

const calculateInstallmentPayment = (
    principal: number,
    annualRateDecimal: number,
    totalPayments: number,
    paymentsPerYear: number
): number => {
    if (principal <= 0 || totalPayments <= 0 || paymentsPerYear <= 0) return 0;
    const ratePerPayment = annualRateDecimal / paymentsPerYear;
    if (ratePerPayment === 0) return principal / totalPayments;
    return (principal * ratePerPayment) / (1 - Math.pow(1 + ratePerPayment, -totalPayments));
}

const payment_schedule = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.payment_scheduleParams;

    if (params.start_time == day) {
        //Pay off loan in reocurring payments 
        envelopes[params.from_key].balance -= params.payment;
        envelopes[params.to_key].balance += params.payment;
        console.log(`Payment Schedule executed on day ${day}: Paid ${params.payment} from ${params.from_key} to ${params.to_key}`);
    }
    else if (event.is_recurring && day <= params.end_time) {
        if ((day - params.start_time) % Math.round(params.frequency_days) == 0) {
            // Check if loan balance is less than payment, if so then just pay off remaining balance
            if (envelopes[params.to_key].balance*-1 < params.payment) {
                console.log('blacne, and payment', envelopes[params.to_key].balance, params.payment);
                envelopes[params.from_key].balance += envelopes[params.to_key].balance;
                envelopes[params.to_key].balance = 0;
                return;
            }
            envelopes[params.from_key].balance -= params.payment;
            envelopes[params.to_key].balance += params.payment;
        }
    }
}


const loan = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.loanParams;

    if (params.start_time == day) {
        //Calculate the amoratization schedule and save to the event
        const monthly_payment = calculate_loan_payment(params.principal, envelopes[params.to_key].interest_rate, params.loan_term_years);

        envelopes[params.to_key].balance += params.principal; // Add loan amount to the envelope
        event.amortization_schedule = { monthly_payment: monthly_payment, remaining_principal: params.principal, interest_rate: envelopes[params.to_key].interest_rate, term_years: params.loan_term_years, start_time: day, end_day: day + params.loan_term_years * 365 };
    }

    // Process monthly payments
    if (event.amortization_schedule && event.amortization_schedule.start_time <= day && day <= event.amortization_schedule.end_day) {
        // See if the payment is necessary on this day
        if ((day - event.amortization_schedule.start_time) % params.frequency_days == 0) {
            envelopes[params.to_key].balance -= event.amortization_schedule.monthly_payment;
            event.amortization_schedule.remaining_principal -= (event.amortization_schedule.monthly_payment - (event.amortization_schedule.remaining_principal * (envelopes[params.to_key].interest_rate / 12)));
        }
    }

    //on final day of loan, clear out any remaining principal
    if (event.amortization_schedule && day == event.amortization_schedule.end_day) {
        envelopes[params.to_key].balance -= event.amortization_schedule.remaining_principal;
        event.amortization_schedule.remaining_principal = 0;
    }
};

const purchase = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.purchaseParams;

    if (params.start_time == day) {
        envelopes[params.from_key].balance -= params.money;
    }
    if (event.is_recurring && day <= params.end_time) {
        if ((day - params.start_time) % Math.round(params.frequency_days) == 0) {
            envelopes[params.from_key].balance -= params.money;
        }
    }
}

const gift = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.giftParams;

    if (params.start_time == day) {
        envelopes[params.to_key].balance += params.money;
    }
    if (event.is_recurring && day <= params.end_time) {
        if ((day - params.start_time) % Math.round(params.frequency_days) == 0) {
            envelopes[params.to_key].balance += params.money;
        }
    }
}

const monthly_budgeting = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.monthly_budgetingParams;

    if (event.updating_events.length > 0) {
        for (const updating_event of event.updating_events) {
            switch (updating_event.type) {
                case "update_monthly_budget": {
                    const uParams = updating_event.parameters as AllEventTypes.monthly_budgeting_update_monthly_budgetParams;
                    if (uParams.start_time == day) {
                        const key = uParams.key;
                        if (key in params) {
                            (params as any)[key] = uParams.amount;
                        }
                    }
                }
            }
        }
    }

    if (params.start_time == day || (event.is_recurring && (day - params.start_time) % params.frequency_days == 0)) {
        //subtract each amount from the from key
        envelopes[params.from_key].balance -= params.dining_out;
        envelopes[params.from_key].balance -= params.entertainment;
        envelopes[params.from_key].balance -= params.groceries;
        envelopes[params.from_key].balance -= params.healthcare;
        envelopes[params.from_key].balance -= params.insurance;
        envelopes[params.from_key].balance -= params.miscellaneous;
        envelopes[params.from_key].balance -= params.personal_care;
        envelopes[params.from_key].balance -= params.rent;
        envelopes[params.from_key].balance -= params.utilities;
        envelopes[params.from_key].balance -= params.transportation;
    }
}

const get_job = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.get_jobParams;

    if (event.updating_events.length > 0) {
        for (const updating_event of event.updating_events) {
            switch (updating_event.type) {
                case "get_a_raise": {
                    const uParams = updating_event.parameters as AllEventTypes.get_job_get_a_raiseParams;
                    if (uParams.start_time == day) {
                        params.salary = uParams.salary;
                    }
                    break;
                }
    
                case "reoccurring_raise": {
                    const uParams = updating_event.parameters as AllEventTypes.get_job_reoccurring_raiseParams;
                    console.log("uparam", uParams);
                    // reocurring raise logic
                    if ((day - uParams.start_time) % Math.round(uParams.frequency_days) == 0 && day >= uParams.start_time && day <= uParams.end_time) {
                        params.salary += uParams.salary_increase;
                    }
                    break;
                }
                case "get_a_bonus": {
                    const uParams = updating_event.parameters as AllEventTypes.get_job_get_a_bonusParams;
                    if (uParams.start_time == day) {
                        envelopes[params.to_key].balance += uParams.bonus;
                    }
                    break;
                }
                case "change_401k_contribution": {
                    const uParams = updating_event.parameters as AllEventTypes.get_job_change_401k_contributionParams;
                    if (uParams.start_time == day) {
                        params.p_401k_contribution = uParams.p_401k_contribution;
                    }
                    break;
                }
            }
        }
    }

    // Calculate if its payday
    const payPeriodDays = Math.round(365 / params.pay_period);
    if (day <= params.end_time && (day - params.start_time) % payPeriodDays == 0) {
        //Calculate paycheck
        const grosspay = params.salary / params.pay_period;

        const employee_401K = grosspay * params.p_401k_contribution;
        const employer_match = grosspay * params.p_401k_match;

        const taxable_income = grosspay - employee_401K;

        const federal = taxable_income * params.federal_income_tax;
        const state = taxable_income * params.state_income_tax;
        const local = taxable_income * params.local_income_tax;
        const social = grosspay * params.social_security_tax;
        const medicare = grosspay * params.medicare_tax;

        const total_withheld = federal + state + local + social + medicare;

        const netpay = grosspay - employee_401K - total_withheld;

        envelopes[params.to_key].balance += netpay;
        envelopes[params.p_401k_key!].balance += employee_401K + employer_match;
        envelopes[params.taxable_income_key!].balance += taxable_income;
        envelopes[params.federal_withholdings_key!].balance += federal + social + medicare;
        envelopes[params.state_withholdings_key!].balance += state;
        envelopes[params.local_withholdings_key!].balance += local;
    }
}

const get_wage_job = (day: number, event: any, envelopes: Record<string, any>) => {
    const params = event.parameters as AllEventTypes.get_wage_jobParams;

    if (event.updating_events.length > 0) {
        for (const updating_event of event.updating_events) {
            switch (updating_event.type) {
                case "get_a_raise": {
                    const uParams = updating_event.parameters as AllEventTypes.get_wage_job_get_a_raiseParams;
                    if (uParams.start_time == day) {
                        params.hourly_wage = uParams.new_hourly_wage;
                    }
                    break;
                }
                case "change_hours": {
                    const uParams = updating_event.parameters as AllEventTypes.get_wage_job_change_hoursParams;
                    if (uParams.start_time == day) {
                        params.hours_per_week = uParams.new_hours;
                    }
                    break;
                }
                case "change_401k_contribution": {
                    const uParams = updating_event.parameters as AllEventTypes.get_wage_job_change_401k_contributionParams;
                    if (uParams.start_time == day) {
                        params.p_401k_contribution = uParams.p_401k_contribution;
                    }
                    break;
                }
                case "change_employer_match": {
                    const uParams = updating_event.parameters as AllEventTypes.get_wage_job_change_employer_matchParams;
                    if (uParams.start_time == day) {
                        params.employer_match = uParams.new_match_rate;
                    }
                    break;
                }
            }
        }
    }

    const payPeriodDays = Math.round(params.frequency_days || (365 / params.pay_period));
    if (day <= params.end_time && (day - params.start_time) % payPeriodDays == 0) {
        const hoursPerPeriod = params.hours_per_week * (payPeriodDays / 7);
        const grosspay = params.hourly_wage * hoursPerPeriod;

        const employee_401K = grosspay * params.p_401k_contribution;
        const employer_match = grosspay * params.employer_match;

        const taxable_income = grosspay - employee_401K;

        const federal = taxable_income * params.federal_income_tax;
        const state = taxable_income * params.state_income_tax;
        const social = grosspay * params.social_security_tax;
        const medicare = grosspay * params.medicare_tax;

        const total_withheld = federal + state + social + medicare;
        const netpay = grosspay - employee_401K - total_withheld;

        envelopes[params.to_key].balance += netpay;
        envelopes[params.p_401k_key!].balance += employee_401K + employer_match;
        envelopes[params.taxable_income_key!].balance += taxable_income;
        envelopes[params.federal_withholdings_key!].balance += federal + social + medicare;
        envelopes[params.state_withholdings_key!].balance += state;
        envelopes[params.local_withholdings_key!].balance += 0;
    }
}

const buy_car = (
    day: number,
    event: any,
    envelopes: Record<string, any>,
    onParameterUpdate?: (update: ParameterUpdate) => void
) => {
    const params = event.parameters as AllEventTypes.buy_carParams;

    if (!envelopes[params.from_key] || !envelopes[params.to_key] || !envelopes[params.car_loan_account]) {
        return;
    }

    const paymentIntervalDays = Math.max(1, Number(params.frequency_days || 30));
    const loanTermYears = Number(params.loan_term_years || 0);

    if (params.start_time == day && !event._car_loan_state) {
        const principal = Math.max(0, params.car_value - params.downpayment);
        const annualRate = envelopes[params.car_loan_account]?.growth_rate ?? 0;
        const totalPayments = Math.max(0, Math.round((loanTermYears * 365) / paymentIntervalDays));
        const paymentsPerYear = 365 / paymentIntervalDays;
        const paymentAmount = calculateInstallmentPayment(principal, annualRate, totalPayments, paymentsPerYear);
        const projectedEndDay = day + Math.ceil(paymentIntervalDays * totalPayments);

        event._car_loan_state = {
            payment_amount: paymentAmount,
            remaining_principal: principal,
            start_time: day,
            end_day: projectedEndDay,
            next_payment_day: day + paymentIntervalDays,
            total_payments: totalPayments,
            payments_made: 0,
            payment_interval_days: paymentIntervalDays
        };

        envelopes[params.from_key].balance -= params.downpayment;
        envelopes[params.to_key].balance += params.car_value;
        envelopes[params.car_loan_account].balance -= principal;
    }

    if (event.updating_events.length > 0) {
        for (const updating_event of event.updating_events) {
            switch (updating_event.type) {
                case 'pay_loan_early': {
                    const uParams = updating_event.parameters as AllEventTypes.buy_car_pay_loan_earlyParams;
                    if (uParams.start_time == day && event._car_loan_state) {
                        envelopes[uParams.from_key].balance -= uParams.amount;
                        envelopes[params.car_loan_account].balance += uParams.amount;

                        event._car_loan_state.remaining_principal = Math.max(0, -envelopes[params.car_loan_account].balance);
                        if (event._car_loan_state.remaining_principal <= 0) {
                            event._car_loan_state.end_day = day;
                            params.end_time = day;
                            if (onParameterUpdate && typeof event.id === 'number') {
                                onParameterUpdate({ eventId: event.id, paramType: 'end_time', value: day });
                            }
                        }
                    }
                    break;
                }
                case 'car_repair': {
                    const uParams = updating_event.parameters as AllEventTypes.buy_car_car_repairParams;
                    if (uParams.start_time == day) {
                        envelopes[uParams.from_key].balance -= uParams.cost;
                    }
                    break;
                }
            }
        }
    }

    if (event._car_loan_state && day >= event._car_loan_state.start_time && day <= event._car_loan_state.end_day) {
        const state = event._car_loan_state;
        const outstandingDebt = Math.max(0, -envelopes[params.car_loan_account].balance);
        state.remaining_principal = outstandingDebt;

        const interval = Number(state.payment_interval_days || paymentIntervalDays);
        const canMakePayment =
            outstandingDebt > 0 &&
            (state.total_payments == null || state.payments_made < state.total_payments) &&
            day + 1e-9 >= (state.next_payment_day ?? (state.start_time + interval));

        if (canMakePayment) {
            const scheduledPayment = Number(state.payment_amount || 0);
            const actualPayment = Math.min(scheduledPayment, outstandingDebt);

            envelopes[params.from_key].balance -= actualPayment;
            envelopes[params.car_loan_account].balance += actualPayment;

            state.remaining_principal = Math.max(0, -envelopes[params.car_loan_account].balance);
            state.payments_made = (state.payments_made ?? 0) + 1;
            state.next_payment_day = (state.next_payment_day ?? (state.start_time + interval)) + interval;

            const isLastPayment =
                state.remaining_principal <= 0 ||
                (state.total_payments != null && state.payments_made >= state.total_payments);

            if (isLastPayment) {
                state.end_day = day;
                params.end_time = day;
                if (onParameterUpdate && typeof event.id === 'number') {
                    onParameterUpdate({ eventId: event.id, paramType: 'end_time', value: day });
                }
            }
        }
    }
}

const buy_house = (
    day: number,
    event: any,
    envelopes: Record<string, any>,
    onParameterUpdate?: (update: ParameterUpdate) => void
) => {
    const params = event.parameters as AllEventTypes.buy_houseParams;
    // Check if any of the envelopes are undefined if so then skip
    if (!envelopes[params.from_key] || !envelopes[params.to_key] || !envelopes[params.mortgage_account]) {
        return;
    }

    const isEnabled = (key: string) => event.event_functions?.[key] ?? true;

    const loan_term_years = Number(params.loan_term_years);

    // On day of purchase set up the morgage and down payment
    if (params.start_time == day && !event._mortgage_state) {
        const principal = Math.max(0, params.home_value - params.downpayment);
        const annualRate = envelopes[params.mortgage_account]?.growth_rate ?? 0;
        const monthlyPayment = calculateMortgagePayment(principal, annualRate, loan_term_years);
        const totalPayments = Math.max(0, Math.round(loan_term_years * 12));
        const projectedEndDay = day + Math.ceil((365 / 12) * totalPayments);

        event._home_value = params.home_value;
        event._mortgage_state = {
            monthly_payment: monthlyPayment,
            remaining_principal: principal,
            interest_rate: annualRate,
            start_time: day,
            end_day: projectedEndDay,
            next_payment_day: day + (365 / 12),
            total_payments: totalPayments,
            payments_made: 0
        };

        if (isEnabled('downpayment')) {
            envelopes[params.from_key].balance -= params.downpayment;
        }
        if (isEnabled('home_asset')) {
            envelopes[params.to_key].balance += params.home_value;
        }
        if (isEnabled('morgage_loan')) {
            envelopes[params.mortgage_account].balance -= principal;
        }
    }

    if (event.updating_events.length > 0) {
        for (const updating_event of event.updating_events) {
            switch (updating_event.type) {
                case 'new_appraisal': {
                    const uParams = updating_event.parameters as AllEventTypes.buy_house_new_appraisalParams;
                    if (uParams.start_time == day) {
                        if (isEnabled('home_asset')) {
                            envelopes[params.to_key].balance = uParams.appraised_value;
                        }
                    }
                    break;
                }
                case 'extra_mortgage_payment': {
                    const uParams = updating_event.parameters as AllEventTypes.buy_house_extra_mortgage_paymentParams;
                    if (uParams.start_time == day && event._mortgage_state) {
                        envelopes[uParams.from_key].balance -= uParams.amount;
                        if (isEnabled('morgage_loan')) {
                            envelopes[params.mortgage_account].balance += uParams.amount;
                            event._mortgage_state.remaining_principal = Math.max(0, -envelopes[params.mortgage_account].balance);
                            if (event._mortgage_state.remaining_principal <= 0) {
                                event._mortgage_state.end_day = day;
                            }
                        }
                    }
                    break;
                }
                case 'late_payment': {
                    const uParams = updating_event.parameters as AllEventTypes.buy_house_late_paymentParams;
                    if (uParams.start_time == day) {
                        envelopes[uParams.from_key].balance -= uParams.amount;
                    }
                    break;
                }
                case 'sell_house': {
                    const uParams = updating_event.parameters as AllEventTypes.buy_house_sell_houseParams;
                    if (uParams.start_time == day) {
                        const homeValue = event._home_value ?? params.home_value;
                        if (isEnabled('home_asset')) {
                            envelopes[uParams.from_key].balance -= homeValue;
                        }
                        envelopes[uParams.to_key].balance += uParams.sale_price;

                        if (event._mortgage_state) {
                            const payoff = Math.max(0, -envelopes[params.mortgage_account].balance);
                            envelopes[uParams.to_key].balance -= payoff;
                            if (isEnabled('morgage_loan')) {
                                envelopes[params.mortgage_account].balance += payoff;
                            }
                            event._mortgage_state.remaining_principal = 0;
                            event._mortgage_state.end_day = day;
                        }
                    }
                    break;
                }
                case 'refinance_home': {
                    const uParams = updating_event.parameters as AllEventTypes.buy_house_refinance_homeParams;
                    if (uParams.start_time == day && event._mortgage_state) {
                        const newEnvelopeKey = uParams.new_home_mortgage_account;
                        if (!newEnvelopeKey || !envelopes[newEnvelopeKey]) {
                            break;
                        }

                        const remainingPrincipal = Math.max(0, -envelopes[params.mortgage_account].balance);
                        const previousEnvelopeKey = params.mortgage_account;

                        if (isEnabled('morgage_loan')) {
                            if (previousEnvelopeKey && envelopes[previousEnvelopeKey]) {
                                envelopes[previousEnvelopeKey].balance = 0;
                            }
                            envelopes[newEnvelopeKey].balance -= remainingPrincipal;
                        }

                        const newLoanTermYears = Number(uParams.new_loan_term_years || loan_term_years);
                        const newAnnualRate = envelopes[newEnvelopeKey]?.growth_rate ?? event._mortgage_state.interest_rate ?? 0;
                        const newMonthlyPayment = calculateMortgagePayment(remainingPrincipal, newAnnualRate, newLoanTermYears);
                        const totalPayments = Math.max(0, Math.round(newLoanTermYears * 12));
                        const projectedEndDay = day + Math.ceil((365 / 12) * totalPayments);

                        params.mortgage_account = newEnvelopeKey;
                        params.loan_term_years = String(newLoanTermYears);

                        event._mortgage_state = {
                            monthly_payment: newMonthlyPayment,
                            remaining_principal: remainingPrincipal,
                            interest_rate: newAnnualRate,
                            start_time: day,
                            end_day: projectedEndDay,
                            next_payment_day: day + (365 / 12),
                            total_payments: totalPayments,
                            payments_made: 0
                        };
                    }
                    break;
                }
            }
        }
    }

    if (event._mortgage_state && day >= event._mortgage_state.start_time && day <= event._mortgage_state.end_day) {
        const state = event._mortgage_state;
        const outstandingDebt = Math.max(0, -envelopes[params.mortgage_account].balance);
        state.remaining_principal = outstandingDebt;

        const canMakePayment =
            outstandingDebt > 0 &&
            (state.total_payments == null || state.payments_made < state.total_payments) &&
            day + 1e-9 >= (state.next_payment_day ?? (state.start_time + (365 / 12)));

        if (canMakePayment) {
            const monthlyPayment = state.monthly_payment;
            const actualPayment = Math.min(monthlyPayment, outstandingDebt);

            if (isEnabled('mortgage_payment')) {
                envelopes[params.from_key].balance -= actualPayment;
                if (isEnabled('morgage_loan')) {
                    envelopes[params.mortgage_account].balance += actualPayment;
                    state.remaining_principal = Math.max(0, -envelopes[params.mortgage_account].balance);
                }
            }

            if (isEnabled('property_tax')) {
                const tax = (event._home_value ?? params.home_value) * params.property_tax_rate / 12;
                envelopes[params.from_key].balance -= tax;
            }

            if (isEnabled('final_home_payment_correction') && state.remaining_principal <= 0) {
                if (isEnabled('morgage_loan')) {
                    envelopes[params.mortgage_account].balance = 0;
                }
            }

            state.payments_made = (state.payments_made ?? 0) + 1;
            state.next_payment_day = (state.next_payment_day ?? (state.start_time + (365 / 12))) + (365 / 12);

            const isLastPayment =
                state.remaining_principal <= 0 ||
                (state.total_payments != null && state.payments_made >= state.total_payments);

            if (isLastPayment) {
                state.end_day = day;
                params.end_time = day;
                if (onParameterUpdate && typeof event.id === 'number') {
                    onParameterUpdate({ eventId: event.id, paramType: 'end_time', value: day });
                }
            }
        }
    }
}



