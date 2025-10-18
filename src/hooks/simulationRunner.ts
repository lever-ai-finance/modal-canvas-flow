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

import type { Plan, Schema } from '../contexts/PlanContext';
import type { Datum } from '../visualization/viz_utils';
import { validateProblem, extractSchema, parseEvents } from './schemaChecker';
import type * as AllEventTypes from '../types/generated-types';

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


    const envelopes: Record<string, any> = {};

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
        let value = 0;
        for (const envelope in envelopes) {
            if (envelopes[envelope].account_type === "non-networth") {
                nonNetworthParts[envelope] = envelopes[envelope].balance;
            }
            else {
                parts[envelope] = envelopes[envelope].balance;
                value += envelopes[envelope].balance;
            }
        }

        results.push({ date: day, value: value, parts: parts, nonNetworthParts: nonNetworthParts });
        day++; //go to next day
    }

    return results;
}

const applyEventsToDay = (day: number, eventList: any[], envelopes: Record<string, any>) => {
    for (const event of eventList) {
        if (event.parameters.start_time <= day) {
            switch (event.type) {
                case "inflow":
                    applyInflowToDay(day, event, envelopes);
                    break;
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
                    const uParams = updating_event.parameters as AllEventTypes.update_amountParams;
                    if (uParams.start_time == day) {
                        params.amount = uParams.amount;
                    }
                    break;
                }
                case "increment_amount": {
                    // increment_amount can be recurring and has frequency_days
                    const uParams = updating_event.parameters as AllEventTypes.increment_amountParams;
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
                    const uParams = updating_event.parameters as AllEventTypes.additional_inflowParams;
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
