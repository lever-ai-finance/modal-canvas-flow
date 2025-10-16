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
            





// SampleData updating the computing time points and pull that out of the current state
// Run this on line trips, zoom interval, and after full simulation run
// visible date range, current day, start, end date, interval






//export function computeTimePoints(
// startDate: number,
//     endDate: number,
//         frequency: number,
//             visibleRange ?: { startDate: number, endDate: number },
//             currentDay ?: number
// ): number[] {
//     const points: number[] = [];
//     if (frequency === 365 || frequency === 182.5) {
//         for (let t = startDate; t <= endDate; t += frequency) points.push(t);
//         if (points.length === 0 || points[points.length - 1] !== endDate) points.push(endDate);
//     } else {
//         points.push(startDate);
//         if (visibleRange) {
//             for (let t = visibleRange.startDate; t <= visibleRange.endDate; t += frequency) {
//                 points.push(t);
//             }
//         }
//         if (points[points.length - 1] !== endDate) points.push(endDate);
//     }
//     if (currentDay) {
//         const idx = points.findIndex(t => t === currentDay);
//         if (idx === -1) {
//             // Current day is not in the points array, add it
//             points.push(currentDay);
//             points.sort((a, b) => a - b); // Sort to maintain chronological order
//         }
//     }
//     return points;
// }