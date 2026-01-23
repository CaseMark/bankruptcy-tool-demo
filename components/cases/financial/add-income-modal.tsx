'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AddIncomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSuccess: () => void;
}

// Income sources per Form B 122A-2
const INCOME_SOURCES = [
  { value: 'employment', label: 'Employment (wages, salary, tips, bonuses)' },
  { value: 'self_employment', label: 'Self-Employment / Business' },
  { value: 'rental', label: 'Rental / Real Property Income' },
  { value: 'interest', label: 'Interest / Dividends / Royalties' },
  { value: 'pension', label: 'Pension / Retirement Income' },
  { value: 'government', label: 'Government Benefits (disability, unemployment)' },
  { value: 'spouse', label: 'Spouse Income (if not filing jointly)' },
  { value: 'alimony', label: 'Alimony / Maintenance' },
  { value: 'contributions', label: 'Regular Contributions (family support)' },
  { value: 'other', label: 'Other Income' },
];

// Generate month options for the last 12 months
function getMonthOptions() {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = date.toISOString().slice(0, 7); // YYYY-MM
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

export function AddIncomeModal({ open, onOpenChange, caseId, onSuccess }: AddIncomeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    incomeMonth: '',
    employer: '',
    grossAmount: '',
    netAmount: '',
    incomeSource: 'employment',
    description: '',
  });

  const monthOptions = getMonthOptions();

  const getIncomeSourceLabel = (value: string) => {
    const found = INCOME_SOURCES.find(source => source.value === value);
    return found ? found.label : 'Choose One...';
  };

  const getMonthLabel = (value: string) => {
    const found = monthOptions.find(m => m.value === value);
    return found ? found.label : 'Choose One...';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    if (!formData.incomeMonth) {
      setError('Please select the income month.');
      setLoading(false);
      return;
    }

    if (!formData.grossAmount || parseFloat(formData.grossAmount) <= 0) {
      setError('Please enter a valid gross amount.');
      setLoading(false);
      return;
    }

    const connectionString = localStorage.getItem('bankruptcy_db_connection');

    if (!connectionString) {
      setError('Database connection not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/cases/${caseId}/income?connectionString=${encodeURIComponent(connectionString)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incomeMonth: formData.incomeMonth,
            employer: formData.employer || null,
            grossAmount: parseFloat(formData.grossAmount),
            netAmount: formData.netAmount ? parseFloat(formData.netAmount) : null,
            incomeSource: formData.incomeSource,
            description: formData.description || null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add income');
      }

      // Reset form and close
      setFormData({
        incomeMonth: '',
        employer: '',
        grossAmount: '',
        netAmount: '',
        incomeSource: 'employment',
        description: '',
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Income Record</DialogTitle>
          <DialogDescription>
            Enter income received during a specific month for the 6-month CMI calculation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incomeMonth">Income Month *</Label>
              <Select
                value={formData.incomeMonth}
                onValueChange={(value) => setFormData(prev => ({ ...prev, incomeMonth: value || '' }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {formData.incomeMonth ? getMonthLabel(formData.incomeMonth) : 'Choose Month...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[200px]">
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incomeSource">Income Source</Label>
              <Select
                value={formData.incomeSource}
                onValueChange={(value) => setFormData(prev => ({ ...prev, incomeSource: value || 'employment' }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {formData.incomeSource ? getIncomeSourceLabel(formData.incomeSource) : 'Choose One...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[280px]">
                  {INCOME_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employer">Employer / Payer Name</Label>
            <Input
              id="employer"
              value={formData.employer}
              onChange={(e) => setFormData(prev => ({ ...prev, employer: e.target.value }))}
              placeholder="e.g., ABC Company, Social Security Admin"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grossAmount">Gross Amount ($) *</Label>
              <Input
                id="grossAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.grossAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, grossAmount: e.target.value }))}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Total income received this month before taxes</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="netAmount">Net Amount ($)</Label>
              <Input
                id="netAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.netAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, netAmount: e.target.value }))}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Take-home pay after deductions</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Regular bi-weekly paycheck, Quarterly dividend"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Income'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
