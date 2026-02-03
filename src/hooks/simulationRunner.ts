// runSimulation

// Psueudocode
// Args: plan (sorted events by day), schema, startDate (number), 
// endDate (number), interval (number), currentDay, birthdate (Date)
// visibleRange: {startDate, (number), endDate (number)}

// Return: All simulation results for all days.

// 

// First get the days that I want the results for visible start to end with interval and the today interval

// RunSimulation manually, save all the data off to a state variable
// After running manual simulation then call sampleData to update the simulation results
// During run simulation, have a loading screen 
// Run this on plan update
// Args: plan, schema, startDate, endDate
// Return: All data envelopes balances for all days

// Take list of all the events with all of their params.
// eventlist - list of all events with their params
// list of evenlope balances
// results - a blank list of the results be parts of total networth
// Set day to the startday
// For day in range(endDate-startDate):
//  for event in eventlist:
//  -------------------- Inflow -------------------------------------------------------------
//      if event = "inflow":
//          if event.params.start_date <= t: // all event.params.start_date exists
//              params = <Inflow> event.params
//              if len(params.updating_events) > 0:
// -----------------Updating params --------------------------
//                  for updating_event in updating_events:
//                      if updating_event == "update_amount":
//                          uparmas = <UpdateParams> updating_event.params
//                          if uparmas.start_time == t:
//                              params.amout = uparmas.amount
//                      if updating_event == "increment_amount":
//                          uparmas = <IncremenParams> updating_event.params
//                          if uparmas.start_time == t:
//                              params.amout += uparmas.amount
//                          if uparams.is_reocurring && t <= uparams.end_date):
//                               if (t-uparams.start_date) % round(uparams.frequency_days):
//                                  params.amout += uparmas.amount
//                      if updating_event == "additional_inflow":
//                          uparmas = <AdditionalParams> updating_event.params
//                          if uparams.start_date == t:
//                              envelope[parmas.to_envelope] += uparams.amount
//                           if the event is reocurring and less than end date then add on the frequency days
//                          if (uevent.is_reocurring && t <= uparams.end_date):
//                              if the day is on a interval from the start date so t - start_date mod interval and if 0 then add mount
//                              if (t-uparams.start_date) % round(uparams.frequency_days):
//                                  envelope[params.to_envelope] += uparams.amount
// -------------------- Event Execution Logic --------------------          
//              If the day is the start date then increment amount 
//              if params.start_date == t:
//                  envelope[parmas.to_envelope] += params.amount
//              if the event is reocurring and less than end date then add on the frequency days
//              if (event.is_reocurring && t <= params.end_date):
//                  if the day is on a interval from the start date so t - start_date mod interval and if 0 then add mount
//                  if (t-params.start_date) % round(params.frequency_days):
//                      envelope[params.to_envelope] += params.amount
//          else: do nothing event doesnt affect the balances on this day
//      
//  -------------------- buy_house -------------------------------------------------------------
//      if event = "buy_house":
//          if event.params.start_date <= t: // all event.params.start_date exists
//              params = <BuyHouse> event.params
//              if len(params.updating_events) > 0:
// -----------------Updating params --------------------------
//                  for updating_event in updating_events:
//                      if updating_event == "new_appraisal":
//                          uparmas = <AppraisalParams> updating_event.params
//                          if uparmas.start_time == t:
//                              params. = uparmas.amount
//                      if updating_event == "increment_amount":
//                          uparmas = <IncremenParams> updating_event.params
//                          if uparmas.start_time == t:
//                              params.amout += uparmas.amount
//                          if uparams.is_reocurring && t <= uparams.end_date):
//                               if (t-uparams.start_date) % round(uparams.frequency_days):
//                                  params.amout += uparmas.amount
//                      if updating_event == "additional_inflow":
//                          uparmas = <AdditionalParams> updating_event.params
//                          if uparams.start_date == t:
//                              envelope[parmas.to_envelope] += uparams.amount
//                           if the event is reocurring and less than end date then add on the frequency days
//                          if (uevent.is_reocurring && t <= uparams.end_date):
//                              if the day is on a interval from the start date so t - start_date mod interval and if 0 then add mount
//                              if (t-uparams.start_date) % round(uparams.frequency_days):
//                                  envelope[params.to_envelope] += uparams.amount
// -------------------- Event Execution Logic --------------------          
//              The day of buying the house take out downpayment, add asset, add loan, create amorztization schedule
//              Attach the amorztization schedule to the event.
//              if params.start_date == t:
//                  envelope[parmas.from_key] -= params.downpayment //remove down payment
//                  envelope[parmas.to_key] += home_value // place money into house
//                  envelope[params.mortgage_envelope] -= (home_value - downpayment)
//                  monthly_payment, principle_payed = loan_amoratized(envelope[params.mortgage_envelope], loan_term_years)
//                  event.amoratization = {t0: monthly_payment, principle_payed, t1: monthly_payment, principle_payed} // Schedule out the monthly payments
//              Pay property taxes
//              if event.amoratization != null:
//                  for payment in event.amoratization:
//                      if payment.time == t:
//                          envelope[params.from_key] -= monthly_payment // pay monthly payment
//                          envelope[params.mortgage_envelope] -= principle_payed //apply principle difference to mortgage envelope
//                          envelope[params.from_key] -= property_tax_rate*params.home_value*1/12
//          else: do nothing event doesnt affect the balances on this day
//      

import type { Plan, Schema, Event } from '../contexts/PlanContext';
import type { Datum } from '../visualization/viz_utils';
import { validateProblem, extractSchema, parseEvents } from './schemaChecker';
import type * as AllEventTypes from '../types/generated-types';
import { Day } from 'react-day-picker';

export async function runSimulation(
    plan: Plan,
    schema: Schema,
    startDate: number,
    endDate: number,
    onParameterUpdate?: (updates: Array<{ eventId: number, paramType: string, value: number }>) => void
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

    let day = startDate; // Start simulation on the first day

    const eventList = parseEvents(plan);

    while (day <= endDate) {
        applyEventsToDay(day, eventList, envelopes);

        // Take balance from envelopes, add balances and append to results
        const parts: { [key: string]: number } = {};
        const nonNetworthParts: { [key: string]: number } = {};
        let total_networth = 0;
        for (const envelope in envelopes) {
            // set the non networthparts to those envleopes and then for networth parts accumulate total value

            if (envelopes[envelope].account_type === "non-networth") {
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

    return results;
}

const applyEventsToDay = (day: number, eventList: [any], envelopes: Record<string, any>) => {
    for (const event of eventList) {
        // check to see if I should even apply the event
        //console.log("Event Title: ", event.title);
        if (event.parameters.start_time <= day) { // event.paramters.start_date exists
            switch (event.type) {
                case "inflow":
                    applyInflowToDay(day, event, envelopes);
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

                // More event types can be added here
                default:
                    break;
                // More event types can be added here
            }
        }
    }
}

//      if event = "inflow":
//          if event.params.start_date <= t: // all event.params.start_date exists
//              params = <Inflow> event.params
//              if len(params.updating_events) > 0:
// -----------------Updating params --------------------------
//                  for updating_event in updating_events:
//                      if updating_event == "update_amount":
//                          uparmas = <UpdateParams> updating_event.params
//                          if uparmas.start_time == t:
//                              params.amout = uparmas.amount
//                      if updating_event == "increment_amount":
//                          uparmas = <IncremenParams> updating_event.params
//                          if uparmas.start_time == t:
//                              params.amout += uparmas.amount
//                          if uparams.is_reocurring && t <= uparams.end_date):
//                               if (t-uparams.start_date) % round(uparams.frequency_days):
//                                  params.amout += uparmas.amount
//                      if updating_event == "additional_inflow":
//                          uparmas = <AdditionalParams> updating_event.params
//                          if uparams.start_date == t:
//                              envelope[parmas.to_envelope] += uparams.amount
//                           if the event is reocurring and less than end date then add on the frequency days
//                          if (uevent.is_reocurring && t <= uparams.end_date):
//                              if the day is on a interval from the start date so t - start_date mod interval and if 0 then add mount
//                              if (t-uparams.start_date) % round(uparams.frequency_days):
//                                  envelope[params.to_envelope] += uparams.amount
// -------------------- Event Execution Logic --------------------          
//              If the day is the start date then increment amount 
//              if params.start_date == t:
//                  envelope[parmas.to_envelope] += params.amount
//              if the event is reocurring and less than end date then add on the frequency days
//              if (event.is_reocurring && t <= params.end_date):
//                  if the day is on a interval from the start date so t - start_date mod interval and if 0 then add mount
//                  if (t-params.start_date) % round(params.frequency_days):
//                      envelope[params.to_envelope] += params.amount
//          else: do nothing event doesnt affect the balances on this day
const applyInflowToDay = (day: number, event: any, envelopes: Record<string, any>) => {
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
        // Set balances of each evenlope to the amount
        envelopes[params.envelope1].balance = params.amount1;
        envelopes[params.envelope2].balance = params.amount2;
        envelopes[params.envelope3].balance = params.amount3;
        envelopes[params.envelope4].balance = params.amount4;
        envelopes[params.envelope5].balance = params.amount5;
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
    
                case "reoccuring_raise": {
                    const uParams = updating_event.parameters as AllEventTypes.get_job_reoccurring_raiseParams;

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
    if ((day - params.start_time) % params.pay_period == 0) {
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



