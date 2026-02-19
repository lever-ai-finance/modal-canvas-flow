import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
// import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DollarSign, Target, Home, Plane, TrendingUp, PiggyBank, Building, Wallet, Shield, Sparkles, Pencil, Plus, Trash2, HelpCircle, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { usePlan } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import DatePicker from './DatePicker';
// EditEnvelopeModal is provided by the parent; onboarding will call it via `onOpenEnvelope` prop
import { CATEGORY_BASE_COLORS } from '../visualization/viz_utils';
import type { Envelope, SchemaEvent, Event } from '../contexts/PlanContext';
import {parseEvents} from '../hooks/schemaChecker';


interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
  onAuthRequired?: () => void;
  // Called by onboarding to open the shared EditEnvelopeModal in the parent
  onOpenEnvelope?: (envelope: Envelope, isAdding?: boolean) => void;
  onOpenEvent?: (event: any | null, isAdding?: boolean, eventParams?: any) => void;
}

interface OnboardingData {
  goals: string[];
  financialGoals: string[];
  name: string;
  birthDate: string;
  location: string;
  education: string;
  educationField: string;
  onboarding_state?: string;
}

//

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ isOpen, onComplete, onAuthRequired, onOpenEnvelope, onOpenEvent }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData & { _currentStep?: number }>({
    goals: [],
    financialGoals: [],
    name: '',
    birthDate: '',
    location: '',
    education: '',
    educationField: '',
    onboarding_state: 'user_info',
    _currentStep: 0,
  });
  const [loading, setLoading] = useState(false);
  const { upsertAnonymousOnboarding, upsertAnonymousPlan, fetchAnonymousOnboarding, logAnonymousButtonClick } = useAuth();
  const { updateBirthDate, updateLocation, updateDegree, updateOccupation, updateGoals, addEnvelope, deleteEnvelope, updateEnvelope, plan, schema, deleteEvent, getEventIcon, addEvent} = usePlan();

  const [selectedDefaultEnvelope, setSelectedDefaultEnvelope] = useState<string>('');
  const [selectedDefaultEvent, setSelectedDefaultEvent] = useState<string>('');
  const [showPersonalInfoAdvanced, setShowPersonalInfoAdvanced] = useState(false);
  const [showDebtValidationModal, setShowDebtValidationModal] = useState(false);
  const [debtWithoutPayment, setDebtWithoutPayment] = useState<Envelope | null>(null);
  const [declareAccountEventIds, setDeclareAccountEventIds] = useState<number[]>([]);
  const [accounts, setAccounts] = useState<Record<string, number>>(() => {
    // initialize from plan if available on first render
    const init: Record<string, number> = {};
    try {
      (plan?.envelopes || []).forEach((env: any) => {
        init[env.name] = 0;
      });
    } catch (e) { }
    return init;
  });
  // Modal state managed by parent. Onboarding will call `onOpenEnvelope(envelope, isAdding)`.

  const updateAccount = (key: string, value: number) => {
    setAccounts(prev => ({ ...prev, [key]: value }));
  };

  // Fetch onboarding data on mount, Take out for now 
  // React.useEffect(() => {
  //   let mounted = true;
  //   (async () => {
  //     setLoading(true);
  //     const anonData = await fetchAnonymousOnboarding();
  //     if (anonData && mounted && anonData.onboarding_data) {
  //       setData((prev) => ({ ...prev, ...anonData.onboarding_data }));
  //       // If the fetched data has a _currentStep, set the step
  //       if (typeof anonData.onboarding_data._currentStep === 'number') {
  //         setCurrentStep(anonData.onboarding_data._currentStep);
  //       }
  //     }
  //     setLoading(false);
  //   })();
  //   return () => { mounted = false; };
  // }, [fetchAnonymousOnboarding]);

  // Save onboarding data on every change, including currentStep
  React.useEffect(() => {
    if (!loading) {
      upsertAnonymousOnboarding({ ...data, _currentStep: currentStep });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, currentStep]);

  const totalSteps = 4;

  const handleNext = async () => {
    // After step 1 (Account Balances), save balances as initial values
    if (currentStep === 2) {
      // Take the names and the balacnes for each envelope and put into declare accounts event
      if (declareAccountEventIds.length > 0) {
        declareAccountEventIds.forEach((eventId) => deleteEvent(eventId));
      }

      const accountEntries = (plan?.envelopes || [])
        .filter((env: Envelope) => ['regular'].includes(env.account_type))
        .map((env: Envelope) => ({
          name: env.name,
          amount: env.category === 'Debt' ? -(accounts[env.name] ?? 0) : (accounts[env.name] ?? 0)
        }));

      const chunkSize = 5;
      const newEventIds: number[] = [];
      for (let i = 0; i < accountEntries.length; i += chunkSize) {
        const chunk = accountEntries.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;

        const overrides: Record<string, string | number> = {};
        chunk.forEach((entry, index) => {
          const idx = index + 1;
          overrides[`envelope${idx}`] = entry.name;
          overrides[`amount${idx}`] = entry.amount;
        });

        const eventId = addEvent('declare_accounts', overrides);
        newEventIds.push(eventId);
      }

      setDeclareAccountEventIds(newEventIds);
    }

    // After step 3 (personal info), save all user data to plan
    if (currentStep === 1) {
      // Check for invalid birth date or today or in the future
      if (data.birthDate === '' || data.birthDate === new Date().toISOString().split('T')[0] || data.birthDate > new Date().toISOString().split('T')[0]) {
        toast.error('Please enter a valid birth date');
        return;
      }

      const newBirthDate = new Date(data.birthDate);
      const birthDateString = newBirthDate.toISOString().split('T')[0];
      console.log("birthDateString", birthDateString);

      // Update birth date
      updateBirthDate(birthDateString);

      // Update location
      if (data.location) {
        updateLocation(data.location);
      }

      // Combine education level and field for degree
      const degreeString = data.education && data.educationField
        ? `${data.education} in ${data.educationField}`
        : data.education || data.educationField || '';
      if (degreeString) {
        updateDegree(degreeString);
      }

      // Use education field as occupation
      if (data.educationField) {
        updateOccupation(data.educationField);
      }

      // Combine all goals into a single string
      const allGoals = [
        ...data.goals.map(goal => {
          switch (goal) {
            case 'understanding': return 'Better understanding of current finances';
            case 'management': return 'Better asset management';
            case 'budgeting': return 'Budgeting';
            case 'peace': return 'Peace of mind';
            default: return goal;
          }
        }),
        ...data.financialGoals.map(goal => {
          switch (goal) {
            case 'house': return 'Buying a house';
            case 'retirement': return 'Comfortable retirement';
            case 'vacation': return 'Dream vacation';
            case 'aspirations': return 'Other financial aspirations';
            default: return goal;
          }
        })
      ].join(', ');

      if (allGoals) {
        updateGoals(allGoals);
      }
    }

    // Move to next step or finish
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Before finishing, check if any debt accounts are missing payment schedules
      const debtEnvelopes = plan?.envelopes?.filter((env: Envelope) => 
        env.category === 'Debt' && ['regular'].includes(env.account_type)
      ) || [];
      
      // Check if there's a payment_schedule event for each debt envelope
      for (const debtEnv of debtEnvelopes) {
        const event_list = parseEvents(plan!);
        const hasPaymentPlan = event_list.some((event: any) =>
            event.type === 'payment_schedule' &&
            event.parameters.to_key === debtEnv.name
          );
        
        if (!hasPaymentPlan) {
          // Found a debt without payment plan - show validation modal
          setDebtWithoutPayment(debtEnv);
          setShowDebtValidationModal(true);
          return; // Stop here and wait for user action
        }
      }
      
      // All debts have payment plans (or no debts) - proceed with completion
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    // save plan to anonymous onboarding data
    try {
      if (plan) {
        const onboardingName = data.name?.trim();
        const planName = onboardingName
          ? `${onboardingName} Plan`
          : ((plan.title && plan.title.trim()) ? plan.title.trim() : 'Onboarding Plan');
        await upsertAnonymousPlan(planName, plan);
      }
    } catch (error) {
      console.warn('Failed to persist onboarding plan anonymously:', error);
    }

    // When completing the modal, transition from 'user_info' to 'basics' to start progressive access
    if (logAnonymousButtonClick) {
      await logAnonymousButtonClick('modal_completed');
    }
    // Close the modal and let the user continue with progressive onboarding
    onAuthRequired!();
  };

  const handleAddPaymentPlan = () => {
    setShowDebtValidationModal(false);
    if (debtWithoutPayment) {
      // Find the payment_schedule event schema
      const paymentScheduleEvent = schema?.events?.find((e: SchemaEvent) => e.type === 'payment_schedule');
      if (paymentScheduleEvent) {
        // Pre-populate with the debt envelope
        onOpenEvent?.(paymentScheduleEvent, true, { from_envelope: debtWithoutPayment.name });
      }
    }
  };

  const handleSkipPaymentPlan = () => {
    setShowDebtValidationModal(false);
    setDebtWithoutPayment(null);
    // No more debts without payment plans - complete onboarding
    completeOnboarding();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    {
      title: " ",
      content: (
        <div className="relative py-8">
          <div className="text-center space-y-12 relative z-10">
            <div className="space-y-10">
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground/90 tracking-tight leading-relaxed px-4">
                A sandbox for modeling<br />financial events over time
              </h1>

              <div className="space-y-6 max-w-xl mx-auto px-6">
                <p className="text-base text-muted-foreground/90 leading-relaxed font-light">
                  Create a personalized financial timeline that brings your income, savings, debt, and goals into one connected view.
                </p>
                <p className="text-base text-muted-foreground/90 leading-relaxed font-light">
                  From there, model decisions in context and see how each choice ripples across everything else over time.
                </p>
                <p className="text-base text-muted-foreground/80 leading-relaxed font-normal">
                  This is where isolated decisions become a coherent plan—and where clarity compounds.
                </p>
              </div>

              <div className="pt-2">
                <p className="text-sm text-muted-foreground/70 italic max-w-md mx-auto font-light">
                  No commitment—just a fast way to answer "what if?"
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    // Step 4: Personal Information
    {
      title: "Create Your Financial Timeline",
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label htmlFor="birthDate">Birth Date</Label>
              <DatePicker
                value={data.birthDate}
                onChange={(date) => setData(prev => ({ ...prev, birthDate: date || '' }))}
                showAgeInput={false}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for how age affects financial model
              </p>
            </div>

            {/* Advanced Options Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPersonalInfoAdvanced(!showPersonalInfoAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 px-1 rounded hover:bg-muted/50"
              >
                {showPersonalInfoAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>Advanced Options</span>
              </button>
            </div>

            {/* Advanced Options Content */}
            {showPersonalInfoAdvanced && (
              <div className="space-y-4 pt-2 pb-2 px-2 border-l-2 border-muted">
                <div>
                  <Label htmlFor="location">City Location</Label>
                  <Input
                    id="location"
                    value={data.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., San Francisco, CA"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for finding local financial metrics (cost of living, mortgage rates, etc.)
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="education">Education Level</Label>
                    <select
                      id="education"
                      value={data.education}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setData(prev => ({ ...prev, education: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select education level</option>
                      <option value="High School">High School</option>
                      <option value="Associate's">Associate's Degree</option>
                      <option value="Bachelor's">Bachelor's Degree</option>
                      <option value="Master's">Master's Degree</option>
                      <option value="Doctorate">Doctorate (PhD, MD, etc.)</option>
                      <option value="Other">Other</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used to get estimates on salary and job reports.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="educationField">Degree or Field of Study</Label>
                    <Input
                      id="educationField"
                      value={data.educationField}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData(prev => ({ ...prev, educationField: e.target.value }))}
                      placeholder="e.g., Computer Science, Business, Engineering"
                      className="w-full mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Used to personalize job and salary estimates.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: "Account Balances",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-4">
            <span className="text-sm text-muted-foreground mr-2">Add Account Balance:</span>
            <div className="flex-1">
              <Select
                value={selectedDefaultEnvelope}
                onValueChange={(val) => {
                  setSelectedDefaultEnvelope('');
                  const env = schema?.default_envelopes?.find((d: any) => d.name === val);
                  if (env) {
                      onOpenEnvelope?.(env, true);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Account..." />
                </SelectTrigger>
                <SelectContent>
                  {schema?.default_envelopes
                    ?.filter((env: any) => ['regular'].includes(env.account_type)
                      && ['Cash', 'Checking Account', 'High Yield Savings', 'Investment Account', 'Roth IRA Account', '401K Account', 'House Equity', 'Car Value', 'Car Loan', 'Home Mortgage', 'Student Loans', 'Personal Loan'].includes(env.name))
                    .map((env: any) => (
                      <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List of plan envelopes with balance inputs */}
          <div className="flex flex-col" style={{ minHeight: '18rem', maxHeight: '28rem' }}>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
              {(plan?.envelopes?.filter((env: Envelope) => ['regular'].includes(env.account_type)) || []).map((env: Envelope) => (
                <Card key={env.name} className="p-0 border border-border/30 hover:border-primary/20 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: (CATEGORY_BASE_COLORS[env.category] || '#E5E7EB') + '22',
                          border: `2px solid ${CATEGORY_BASE_COLORS[env.category] || '#c7d2fe'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '2rem',
                          height: '2rem',
                        }}
                      >
                        {(() => {
                          const map: Record<string, any> = {
                            'Savings': PiggyBank,
                            'Investments': TrendingUp,
                            'Retirement': Shield,
                            'Debt': CreditCard,
                            'Cash': Wallet,
                            'Assets': Building
                          };
                          const Icon = map[env.category] || DollarSign;
                          return <Icon className="w-4 h-4" />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{env.name}</h3>
                          {env.tax_account_type && env.tax_account_type !== 'none' && (
                            <span className="ml-2 text-xs text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full">
                              {schema?.tax_account_types?.find((t: any) => t.value === env.tax_account_type)?.name || env.tax_account_type}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{env.category}</span>
                        </div>
                        <div
                          className="mt-1 text-xs text-gray-400 bg-gray-50 rounded px-2 py-1 border border-gray-100 cursor-pointer hover:bg-gray-100"
                          onClick={() => { onOpenEnvelope?.(env, false); }}
                        >
                          {env.growth === 'None' ? (
                            <span className="font-mono">No growth over time</span>
                          ) : (env.rate !== undefined && env.rate > 0 ? (
                            <span className="font-mono">{env.growth}: {(env.rate * 100).toFixed(2)}%/yr</span>
                          ) : null)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <span className="text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={String(accounts[env.name] ?? '')}
                          onChange={(e) => {
                            const v = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            updateAccount(env.name, v);
                          }}
                          placeholder="0"
                          className="w-32 text-right"
                        />
                      </div>
                        <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="ml-1 p-1 h-8 w-8 text-gray-400 hover:text-blue-500"
                        onClick={() => { onOpenEnvelope?.(env, false); }}
                        aria-label="Manage envelope"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="ml-1 p-1 h-8 w-8 text-gray-400 hover:text-red-600"
                        onClick={() => { if (env.envelope_id !== undefined) deleteEnvelope(env.envelope_id); }}
                        aria-label="Delete envelope"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary row: total of balances tracked in component */}
            <div className="border-t border-border/50 pt-4 bg-white mt-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">Total Value</span>
                </div>
                <span className="text-lg font-bold text-primary">${(
                  (plan?.envelopes?.filter((env: Envelope) => ['regular'].includes(env.account_type)) || []).reduce((sum, env) => {
                    const value = accounts[env.name] || 0;
                    return sum + (env.category === 'Debt' ? -value : value);
                  }, 0)
                ).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Cash Flow",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-4">
            <span className="text-sm text-muted-foreground mr-2">Add Cash Flow Event:</span>
            <div className="flex-1">
              <Select
                value={selectedDefaultEvent}
                onValueChange={(val) => {
                  const event = schema?.events?.find((d: SchemaEvent) => d.type === val);
                  if (event) onOpenEvent?.(event, true);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Event..." />
                </SelectTrigger>
                <SelectContent>
                  {schema?.events?.filter((env: SchemaEvent) => ['inflow', 'outflow', 'monthly_budgeting', 'get_job', 'get_wage_job', 'payment_schedule'].includes(env.type))
                    .map((event: SchemaEvent) => (
                      <SelectItem key={event.type} value={event.type}>{event.display_type}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List of plan events inputs */}
          <div className="flex flex-col" style={{ minHeight: '18rem', maxHeight: '28rem' }}>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
              {(plan?.events || []).map((event: Event) => (
                <Card key={event.type} className="p-0 border border-border/30 hover:border-primary/20 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-start space-x-4 min-w-0">
                      <div
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{
                          backgroundColor: (CATEGORY_BASE_COLORS['Cash']) + '22',
                          border: `2px solid '#c7d2fe'`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '2rem',
                          height: '2rem',
                        }}
                      >
                        {getEventIcon(event.type, event)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                          <h3 className="font-semibold truncate">{event.title}</h3>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center space-x-2 flex-shrink-0">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="p-1 h-8 w-8 text-gray-400 hover:text-blue-500"
                        onClick={() => { onOpenEvent?.(event, false); }}
                        aria-label="Manage envelope"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="p-1 h-8 w-8 text-gray-400 hover:text-red-600"
                        onClick={() => { if (event.id !== undefined) deleteEvent(event.id); }}
                        aria-label="Delete envelope"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Informative note - always at end of list */}
              <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-3 mt-2">
                <h3 className="font-medium text-foreground text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Add your income and expenses to model your financial timeline
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 pl-6">
                  <li className="list-disc"><span className="font-medium text-foreground">Employment:</span> Add salary or wage jobs to track your regular income</li>
                  <li className="list-disc"><span className="font-medium text-foreground">Other Income:</span> Include additional income sources like bonuses, side projects, or investments</li>
                  <li className="list-disc"><span className="font-medium text-foreground">Expenditures:</span> Track your monthly expenses and budgeting categories</li>
                  <li className="list-disc"><span className="font-medium text-foreground">Loan Payments:</span> Model how your debt payments will be paid off over time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-2xl max-w-4xl mx-8">
          <DialogHeader>
            <DialogTitle className="sr-only">Loading Onboarding</DialogTitle>
          </DialogHeader>
          <div className="py-16 text-center text-lg">Loading your onboarding progress...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSkipToLogin = async () => {
    try {
      await logAnonymousButtonClick?.('skip_to_login');
    } catch (e) { }
    setCurrentStep(totalSteps - 1);
    onAuthRequired?.();
  };

  return (
    <>
      {/* Debt Payment Validation Modal */}
      <Dialog open={showDebtValidationModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Missing Payment Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-center text-muted-foreground">
              You have a debt account <span className="font-semibold text-foreground">"{debtWithoutPayment?.name}"</span> without a payment plan.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Would you like to add a payment schedule now?
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={handleAddPaymentPlan} className="w-full">
              Add Payment Plan
            </Button>
            <Button onClick={handleSkipPaymentPlan} variant="outline" className="w-full">
              Skip for Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Onboarding Dialog */}
      <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-2xl max-w-4xl mx-8 max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-6">
          <DialogTitle className="text-center text-2xl font-light">
            {currentStepData.title}
          </DialogTitle>
          <div className="flex justify-center">
            <div className="flex space-x-3">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${index <= currentStep ? 'bg-[#03c6fc] shadow-lg' : 'bg-muted'
                    }`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="py-8 px-2 flex-1 overflow-y-auto">
          {currentStepData.content}
        </div>

        {/* Subtle Skip-to-login button on first step (Account Balances) */}
        {currentStep === 0 && (
          <div className="absolute left-4 bottom-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleSkipToLogin();
              }}
            >
              Skip to login
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-6">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="px-8"
            >
              Back
            </Button>
          )}
          {currentStep === 0 && <div></div>}
          <Button onClick={handleNext} className="px-8">
            {currentStep === totalSteps - 1 ? 'Lets Go!' : currentStep === 0 ? 'Begin Journey' : 'Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default OnboardingFlow;