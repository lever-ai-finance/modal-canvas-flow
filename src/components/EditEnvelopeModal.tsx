
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { usePlan, type Envelope } from '../contexts/PlanContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EditEnvelopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelope?: {
    name: string;
    category: string;
    growth: string;
    rate: number;
    days_of_usefulness?: number;
    account_type: string;
    tax_account_type: string;
    } | null;
  onSave: (envelope: Envelope) => void;
}

const EditEnvelopeModal: React.FC<EditEnvelopeModalProps> = ({ isOpen, onClose, envelope = null, onSave }) => {
  const [name, setName] = useState(envelope?.name || '');
  const [category, setCategory] = useState(envelope?.category || '');
  const [growth, setGrowth] = useState(envelope?.growth || 'None');
  const [rate, setRate] = useState(envelope ? envelope.rate * 100 : 0);
  const [rateInputValue, setRateInputValue] = useState(envelope ? (envelope.rate * 100).toString() : '0');
  const [daysOfUsefulness, setDaysOfUsefulness] = useState(envelope?.days_of_usefulness || 0);
  const [rateError, setRateError] = useState<string>('');
  const [taxAccountType, setTaxAccountType] = useState(envelope?.tax_account_type || 'none');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { schema } = usePlan();

  React.useEffect(() => {
    setName(envelope?.name || '');
    setCategory(envelope?.category || '');
    setGrowth(envelope?.growth || 'None');
    const initialRate = envelope ? envelope.rate * 100 : 0;
    setRate(initialRate);
    setRateInputValue(initialRate.toFixed(2));
    setDaysOfUsefulness(envelope?.days_of_usefulness || 0);
    setRateError('');
    setTaxAccountType(envelope?.tax_account_type || 'none');
    setShowAdvanced(false);
  }, [envelope, isOpen]);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRateInputValue(value);
    setRateError(''); // Clear error when user starts typing
  };

  const handleRateBlur = () => {
    const numValue = parseFloat(rateInputValue) || 0;
    setRate(numValue);
    // Format to 2 decimal places on blur
    setRateInputValue(numValue.toFixed(2));
  };

  const lastSavedRef = React.useRef<number | null>(null);

  const saveEnvelope = (shouldClose = false): boolean => {
    if (!name.trim() || !category) return false;

    const rateValidation = validateRate(rate);
    if (!rateValidation.isValid) {
      setRateError(rateValidation.error || '');
      return false;
    }

    const payload: { name: string; category: string; growth: string; rate: number; days_of_usefulness?: number; account_type: string; tax_account_type: string } = {
      name: name.trim(),
      category,
      growth,
      rate: rate / 100,
      account_type: envelope?.account_type || 'regular',
      tax_account_type: taxAccountType
    };
    if (growth === 'Depreciation (Days)') {
      payload.days_of_usefulness = daysOfUsefulness;
    }

    onSave(payload);

    // reset local state similar to explicit submit
    setName('');
    setCategory('');
    setGrowth('None');
    setRate(0);
    setRateInputValue('0');
    setDaysOfUsefulness(0);
    setRateError('');
    setTaxAccountType('none');

    lastSavedRef.current = Date.now();
    if (shouldClose) onClose();
    return true;
  };

  const validateRate = (rateValue: number): { isValid: boolean; error?: string } => {
    if (rateValue < 0) {
      return { isValid: false, error: 'Rate cannot be less than 0%' };
    }
    if (rateValue > 40) {
      return { isValid: false, error: 'Rate cannot be greater than 40%' };
    }
    return { isValid: true };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveEnvelope(true);
  };

  const growthOptions = [
    { value: 'None', label: 'None' },
    { value: 'Simple Interest', label: 'Simple Interest' },
    { value: 'Appreciation', label: 'Appreciation' },
    { value: 'Daily Compound', label: 'Daily Compound' },
    { value: 'Monthly Compound', label: 'Monthly Compound' },
    { value: 'Yearly Compound', label: 'Yearly Compound' },
    { value: 'Depreciation', label: 'Depreciation (Rate)' },
    { value: 'Depreciation (Days)', label: 'Depreciation (Days)' }
  ];

  const taxTypeDescriptions: Record<string, string> = {
    none: 'No special tax treatment.',
    usa_rothira: 'Roth IRA — contributions are after-tax; qualified withdrawals are tax-free in retirement.',
    usa_traditionalira: 'Traditional IRA — contributions may be tax-deductible; withdrawals are taxed as income.',
    usa_401k: '401K — employer-sponsored retirement account with tax-deferred growth; withdrawals are taxed.'
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // If we just saved via the submit flow, skip saving again
      if (lastSavedRef.current && (Date.now() - lastSavedRef.current) < 1000) {
        return;
      }
      // attempt to save if fields are present/valid, but always close
      saveEnvelope(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Account Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter envelope name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {schema?.categories.map((cat: string) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {growth !== 'Depreciation (Days)' && growth !== 'None' && (
            <div className="space-y-2">
              <Label htmlFor="rate">Growth Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                step="any"
                min="0"
                max="40"
                value={rateInputValue}
                onChange={handleRateChange}
                onBlur={handleRateBlur}
                placeholder="0.00"
                className={rateError ? 'border-red-500' : ''}
              />
              {rateError && (
                <p className="text-xs text-red-500">{rateError}</p>
              )}
              <p className="text-xs text-gray-500">Rate must be between 0% and 40%</p>
            </div>
          )}

          {/* Advanced Options Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 px-1 rounded hover:bg-muted/50"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>Advanced Options</span>
            </button>
          </div>

          {/* Advanced Options Content */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 pb-2 px-2 border-l-2 border-muted">
              <div className="space-y-2">
                <Label htmlFor="growth">Growth Model</Label>
                <Select value={growth} onValueChange={setGrowth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {growthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {growth === 'Depreciation (Days)' && (
                <div className="space-y-2">
                  <Label htmlFor="daysOfUsefulness">Days of Usefulness</Label>
                  <Input
                    id="daysOfUsefulness"
                    type="number"
                    min={1}
                    value={daysOfUsefulness}
                    onChange={(e) => setDaysOfUsefulness(Number(e.target.value))}
                    placeholder="Enter number of days"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="taxAccountType" className="text-sm text-gray-600">Tax Account Type</Label>
                <Select value={taxAccountType} onValueChange={setTaxAccountType}>
                  <SelectTrigger className="text-sm text-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schema?.tax_account_types?.map((t: any) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">{taxTypeDescriptions[taxAccountType] || ''}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-3 pt-4">
            <Button type="submit" className="w-full">
              Save Envelope
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEnvelopeModal;
