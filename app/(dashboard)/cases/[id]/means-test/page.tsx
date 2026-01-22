"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calculator,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  FileText,
  DollarSign,
  Users,
  MapPin,
  ArrowRight,
  RefreshCw,
  Download,
  HelpCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface BankruptcyCase {
  id: string;
  clientName: string;
  caseNumber: string | null;
  caseType: string;
  status: string;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  householdSize: number | null;
  state: string | null;
}

interface MeansTestData {
  caseId: string;
  calculatedAt: string;
  inputs: {
    state: string;
    householdSize: number;
    monthlyGrossIncome: number;
    monthlyExpenses: number;
    totalUnsecuredDebt: number;
    totalSecuredDebt: number;
    hasVehicle: boolean;
    vehicleCount: number;
  };
  irsAllowances: {
    nationalStandards: number;
    housingUtilities: number;
    transportation: number;
    healthCare: number;
    total: number;
  };
  result: {
    passes: boolean;
    annualIncome: number;
    medianIncome: number;
    isAboveMedian: boolean;
    monthlyDisposableIncome?: number;
    sixtyMonthDisposable?: number;
    presumptionOfAbuse: boolean;
    reason: string;
  };
}

export default function CaseMeansTestPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [caseData, setCaseData] = useState<BankruptcyCase | null>(null);
  const [meansTestData, setMeansTestData] = useState<MeansTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectionString = typeof window !== 'undefined' ? localStorage.getItem("bankruptcy_db_connection") : null;

  const fetchMeansTest = useCallback(async () => {
    if (!connectionString) return;

    try {
      const response = await fetch(
        `/api/cases/${id}/means-test?connectionString=${encodeURIComponent(connectionString)}`
      );

      if (response.ok) {
        const data = await response.json();
        setMeansTestData(data);
      }
    } catch (err) {
      console.error("Error fetching means test:", err);
    }
  }, [id, connectionString]);

  useEffect(() => {
    const apiKey = localStorage.getItem("casedev_api_key");
    const connStr = localStorage.getItem("bankruptcy_db_connection");

    if (!apiKey || !connStr) {
      router.push("/login");
      return;
    }

    async function fetchCase() {
      try {
        const response = await fetch(
          `/api/cases/${id}?connectionString=${encodeURIComponent(connStr!)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Case not found");
          } else {
            throw new Error("Failed to fetch case");
          }
          return;
        }

        const data = await response.json();
        setCaseData(data.case);
      } catch (err) {
        console.error("Error fetching case:", err);
        setError("Failed to load case data");
      } finally {
        setLoading(false);
      }
    }

    fetchCase();
    fetchMeansTest();
  }, [id, router, fetchMeansTest]);

  const handleRecalculate = async () => {
    if (!connectionString) return;

    setCalculating(true);
    try {
      const response = await fetch(
        `/api/cases/${id}/means-test?connectionString=${encodeURIComponent(connectionString)}`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        setMeansTestData(data);
      }
    } catch (err) {
      console.error("Error recalculating means test:", err);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{error || "Case not found"}</h2>
          <Link href="/cases" className="text-primary hover:underline">
            Return to Cases
          </Link>
        </div>
      </div>
    );
  }

  // Use calculated data if available, otherwise show placeholder
  const hasData = meansTestData !== null;
  const passesTest = meansTestData?.result.passes ?? false;
  const isAboveMedian = meansTestData?.result.isAboveMedian ?? false;
  const annualIncome = meansTestData?.result.annualIncome ?? 0;
  const medianIncome = meansTestData?.result.medianIncome ?? 0;
  const monthlyDisposableIncome = meansTestData?.result.monthlyDisposableIncome ?? 0;
  const state = meansTestData?.inputs.state ?? caseData.state ?? "—";
  const householdSize = meansTestData?.inputs.householdSize ?? caseData.householdSize ?? 1;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/cases" className="hover:text-foreground">
            Cases
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/cases/${id}`} className="hover:text-foreground">
            {caseData.clientName}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span>Means Test</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Means Test Calculator</h1>
            <p className="text-muted-foreground mt-1">
              Chapter 7 bankruptcy eligibility determination
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculate}
              disabled={calculating}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              {calculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Recalculate
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* No Data Warning */}
      {!hasData && (
        <div className="p-6 rounded-lg border bg-yellow-50 border-yellow-200 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-800">Financial Data Required</h2>
              <p className="text-yellow-700 mt-1">
                Add income, expenses, and debt information in the Financial Data section to calculate the means test.
              </p>
              <Link
                href={`/cases/${id}/financial`}
                className="inline-flex items-center gap-2 mt-3 text-yellow-800 font-medium hover:underline"
              >
                Go to Financial Data
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Result Banner */}
      {hasData && (
        <div className={`p-6 rounded-lg border mb-8 ${
          passesTest
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start gap-4">
            {passesTest ? (
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h2 className={`text-xl font-bold ${passesTest ? 'text-green-800' : 'text-yellow-800'}`}>
                {passesTest
                  ? "Client Qualifies for Chapter 7 Bankruptcy"
                  : "Chapter 13 May Be More Appropriate"}
              </h2>
              <p className={`mt-1 ${passesTest ? 'text-green-700' : 'text-yellow-700'}`}>
                {meansTestData?.result.reason}
              </p>
              {meansTestData?.calculatedAt && (
                <p className="text-sm text-muted-foreground mt-2">
                  Last calculated: {new Date(meansTestData.calculatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <Link
              href={`/cases/${id}/forms`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                passesTest
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              Proceed to Forms
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Input Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {annualIncome > 0 ? `$${annualIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">Annual Income</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{householdSize}</div>
              <div className="text-sm text-muted-foreground">Household Size</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{state}</div>
              <div className="text-sm text-muted-foreground">State</div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calculator className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {medianIncome > 0 ? `$${medianIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </div>
              <div className="text-sm text-muted-foreground">State Median</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Income Comparison */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${!hasData ? 'bg-gray-100' : !isAboveMedian ? 'bg-green-100' : 'bg-yellow-100'}`}>
              {!hasData ? (
                <Calculator className="w-5 h-5 text-gray-400" />
              ) : !isAboveMedian ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-yellow-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">Step 1: Income Comparison</h2>
              <p className="text-sm text-muted-foreground">Compare income to state median</p>
            </div>
          </div>

          {hasData ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Client&apos;s Annual Income</span>
                  <span className="font-semibold">${annualIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">
                    {state} Median ({householdSize} person household)
                  </span>
                  <span className="font-semibold">${medianIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Difference</span>
                    <span className={`font-bold ${
                      annualIncome <= medianIncome
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {annualIncome <= medianIncome ? '-' : '+'}
                      ${Math.abs(annualIncome - medianIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${
                !isAboveMedian ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm font-medium ${!isAboveMedian ? 'text-green-700' : 'text-yellow-700'}`}>
                  {!isAboveMedian
                    ? "Income is below state median. Client automatically qualifies for Chapter 7."
                    : "Income exceeds state median. Proceed to Step 2 for detailed analysis."}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Add financial data to calculate</p>
            </div>
          )}
        </div>

        {/* Step 2: Disposable Income */}
        <div className={`bg-card p-6 rounded-lg border ${!hasData || !isAboveMedian ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${
              !hasData || !isAboveMedian
                ? 'bg-gray-100'
                : passesTest
                  ? 'bg-green-100'
                  : 'bg-red-100'
            }`}>
              {!hasData || !isAboveMedian ? (
                <Calculator className="w-5 h-5 text-gray-400" />
              ) : passesTest ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">Step 2: Disposable Income</h2>
              <p className="text-sm text-muted-foreground">Calculate after allowed deductions</p>
            </div>
          </div>

          {!hasData || !isAboveMedian ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Step 2 not required</p>
              <p className="text-sm">{!hasData ? "Add financial data first" : "Client qualifies based on Step 1"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Income</span>
                  <span className="font-semibold">
                    ${meansTestData?.inputs.monthlyGrossIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">IRS Allowances (Total)</span>
                  <span className="text-red-600">
                    -${meansTestData?.irsAllowances.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span className="text-muted-foreground">National Standards</span>
                  <span className="text-muted-foreground">
                    ${meansTestData?.irsAllowances.nationalStandards.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span className="text-muted-foreground">Housing & Utilities</span>
                  <span className="text-muted-foreground">
                    ${meansTestData?.irsAllowances.housingUtilities.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span className="text-muted-foreground">Transportation</span>
                  <span className="text-muted-foreground">
                    ${meansTestData?.irsAllowances.transportation.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pl-4">
                  <span className="text-muted-foreground">Health Care</span>
                  <span className="text-muted-foreground">
                    ${meansTestData?.irsAllowances.healthCare.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Monthly Disposable Income</span>
                    <span className={`font-bold ${monthlyDisposableIncome <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${monthlyDisposableIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">60-Month Total</span>
                    <span className="text-sm">
                      ${((meansTestData?.result.sixtyMonthDisposable ?? 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${
                passesTest ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm font-medium ${passesTest ? 'text-green-700' : 'text-red-700'}`}>
                  {passesTest
                    ? "Disposable income is below threshold. Client qualifies for Chapter 7."
                    : "Presumption of abuse applies. Chapter 13 is recommended."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* IRS Allowances Detail */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">IRS Standard Allowances</h2>
            </div>
            <button className="text-sm text-primary hover:underline flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              Learn More
            </button>
          </div>

          {hasData && meansTestData?.irsAllowances ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2 text-sm text-muted-foreground">Allowance Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>National Standards (food, clothing, etc.)</span>
                    <span>${meansTestData.irsAllowances.nationalStandards.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>Housing & Utilities ({state})</span>
                    <span>${meansTestData.irsAllowances.housingUtilities.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>Transportation ({meansTestData.inputs.vehicleCount || 1} vehicle{(meansTestData.inputs.vehicleCount || 1) > 1 ? 's' : ''})</span>
                    <span>${meansTestData.irsAllowances.transportation.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>Health Care</span>
                    <span>${meansTestData.irsAllowances.healthCare.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-medium">
                  <span>Total Monthly Allowances</span>
                  <span>${meansTestData.irsAllowances.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Add financial data to see allowances</p>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowRight className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold">Next Steps</h2>
          </div>

          <div className="space-y-4">
            {!hasData ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Add Financial Data</p>
                    <p className="text-sm text-muted-foreground">Enter income, expenses, assets, and debts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium text-muted-foreground">Calculate Means Test</p>
                    <p className="text-sm text-muted-foreground">Click Recalculate to run the analysis</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium text-muted-foreground">Generate Forms</p>
                    <p className="text-sm text-muted-foreground">Auto-populate bankruptcy petition forms</p>
                  </div>
                </div>
              </>
            ) : passesTest ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">Means Test Passed</p>
                    <p className="text-sm text-muted-foreground">Client qualifies for Chapter 7</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Review All Documents</p>
                    <p className="text-sm text-muted-foreground">Ensure all supporting documents are uploaded</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Generate Chapter 7 Forms</p>
                    <p className="text-sm text-muted-foreground">Auto-populate bankruptcy petition forms</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Discuss Chapter 13 Options</p>
                    <p className="text-sm text-muted-foreground">Review repayment plan possibilities with client</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Calculate Payment Plan</p>
                    <p className="text-sm text-muted-foreground">Determine 3-5 year repayment schedule</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Review Special Circumstances</p>
                    <p className="text-sm text-muted-foreground">Check for exceptions that may allow Chapter 7</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
