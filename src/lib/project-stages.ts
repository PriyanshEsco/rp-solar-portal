import { ProjectStageItem, LifecyclePhase, StageStatus, ProjectStageHistoryEntry } from './types';
import crypto from 'crypto';

export interface StageDefinition {
  stageKey: string;
  stageName: string;
  order: number;
  lifecyclePhase: LifecyclePhase;
  description: string;
}

export const LIFECYCLE_PHASES: Array<{
  key: LifecyclePhase;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}> = [
  { key: 'onboarding', label: 'Onboarding & DISCOM Scoping', shortLabel: 'Onboarding', description: 'Customer profiling, load sanity check, and initial tariff scoping.', color: '#0f766e' },
  { key: 'documentation', label: 'Documentation & Financing', shortLabel: 'Documentation', description: 'Financial verification, loan sanctioning, or direct cash advances.', color: '#0369a1' },
  { key: 'registration', label: 'Statutory Registration', shortLabel: 'Registration', description: 'MNRE portal registration and Technical Feasibility Report (TFR).', color: '#6d28d9' },
  { key: 'work_order', label: 'Work Order & Indenting', shortLabel: 'Work Order', description: 'Formal contract issuance, engineering signoff, and indent receipts.', color: '#b45309' },
  { key: 'structure', label: 'Structure Supply & Mounting', shortLabel: 'Structure', description: 'Civil foundation, module mounting structure (MMS) supply and assembly.', color: '#d97706' },
  { key: 'wiring_earthing', label: 'Wiring & Earthing Installation', shortLabel: 'Wiring & Earthing', description: 'AC/DC cabling, chemical earthing pits, and lightning arrester.', color: '#4338ca' },
  { key: 'system_installation', label: 'Solar PV & Inverter Installation', shortLabel: 'System Installation', description: 'PV modules, string inverters, generation meters, and serial uploads.', color: '#047857' },
  { key: 'meter', label: 'Net Metering & Grid Sync', shortLabel: 'Meter', description: 'DISCOM bi-directional net meter installation and synchronization.', color: '#059669' },
  { key: 'inspection', label: 'DISCOM & CEIG Inspections', shortLabel: 'Inspection', description: 'Electrical inspectorate and DISCOM officer plant safety audit.', color: '#be123c' },
  { key: 'subsidy', label: 'Subsidy Application & Disbursal', shortLabel: 'Subsidy', description: 'DBT National Portal submission, claim clearance, and bank credit.', color: '#15803d' },
  { key: 'warranty', label: 'Warranty & Operations Handover', shortLabel: 'Warranty', description: 'Manufacturer equipment warranty cards and generation handbook.', color: '#475569' },
  { key: 'invoice', label: 'Commercial Invoicing & Closure', shortLabel: 'Invoice', description: 'Tax invoice generation, balance settlement, and EPC closure.', color: '#334155' },
];

export const CANONICAL_OPERATIONAL_STAGES: StageDefinition[] = [
  { stageKey: 'brown_file', stageName: 'Brown File', order: 1, lifecyclePhase: 'onboarding', description: 'Sanction against existing consumer electricity connection.' },
  { stageKey: 'new_connection', stageName: 'New Connection', order: 2, lifecyclePhase: 'onboarding', description: 'Fresh meter connection requisition with regional DISCOM.' },
  { stageKey: 'name_correction', stageName: 'Name Correction', order: 3, lifecyclePhase: 'onboarding', description: 'Electricity bill name synchronization with property deed.' },
  { stageKey: 'cot', stageName: 'COT (Change of Tariff)', order: 4, lifecyclePhase: 'onboarding', description: 'Tariff classification adjustment for solar net-metering compliance.' },
  { stageKey: 'load_increased', stageName: 'Load Increased', order: 5, lifecyclePhase: 'onboarding', description: 'Sanctioned connected load enhancement requisition and approval.' },
  { stageKey: 'jan_samarth_loan', stageName: 'Jan Samarth Loan', order: 6, lifecyclePhase: 'documentation', description: 'Government Jan Samarth subsidized solar loan application.' },
  { stageKey: 'cash', stageName: 'Cash', order: 7, lifecyclePhase: 'documentation', description: 'Direct customer cash / RTGS / milestone payment advance.' },
  { stageKey: 'loan', stageName: 'Loan', order: 8, lifecyclePhase: 'documentation', description: 'Commercial / private banking institution credit sanction.' },
  { stageKey: 'tfr', stageName: 'TFR (Technical Feasibility Report)', order: 9, lifecyclePhase: 'registration', description: 'Distribution transformer capacity feasibility sanction.' },
  { stageKey: 'mnre_registration', stageName: 'MNRE Registration', order: 10, lifecyclePhase: 'registration', description: 'National Solar Portal enrollment and registration acknowledgment.' },
  { stageKey: 'work_order', stageName: 'Work Order', order: 11, lifecyclePhase: 'work_order', description: 'Formal EPC work order execution and engineering kickoff.' },
  { stageKey: 'indent_received', stageName: 'Indent Received', order: 12, lifecyclePhase: 'work_order', description: 'Material requisition indent verified and allocated by store.' },
  { stageKey: 'structure_supply', stageName: 'Structure Supply', order: 13, lifecyclePhase: 'structure', description: 'Galvanized iron module mounting structures delivered to site.' },
  { stageKey: 'structure_installation', stageName: 'Structure Installation', order: 14, lifecyclePhase: 'structure', description: 'Structural anchoring, grouting, and tilt-angle mounting verified.' },
  { stageKey: 'wiring_earthing_supply', stageName: 'Wiring & Earthing Supply', order: 15, lifecyclePhase: 'wiring_earthing', description: 'Copper/aluminum solar cables, earthing rods, and compound delivery.' },
  { stageKey: 'wiring_earthing_installation', stageName: 'Wiring & Earthing Installation', order: 16, lifecyclePhase: 'wiring_earthing', description: 'ACDB, DCDB cabling, grounding grid, and surge protection setup.' },
  { stageKey: 'system_supply', stageName: 'System Supply', order: 17, lifecyclePhase: 'system_installation', description: 'Tier-1 Mono PERC modules and on-grid inverter delivery.' },
  { stageKey: 'system_installation', stageName: 'System Installation', order: 18, lifecyclePhase: 'system_installation', description: 'Panel array mounting, string connection, and inverter power testing.' },
  { stageKey: 'details_uploaded', stageName: 'Details Uploaded', order: 19, lifecyclePhase: 'system_installation', description: 'Panel barcode serials, inverter logs, and GPS site photos submitted.' },
  { stageKey: 'vendor_to_be_changed', stageName: 'Vendor to be Changed', order: 20, lifecyclePhase: 'system_installation', description: 'Component vendor alteration / re-allocation tracking if required.' },
  { stageKey: 'net_meter_installed', stageName: 'Net Meter Installed', order: 21, lifecyclePhase: 'meter', description: 'Bidirectional smart meter replacement & DISCOM sealing.' },
  { stageKey: 'inspections', stageName: 'Inspections', order: 22, lifecyclePhase: 'inspection', description: 'DISCOM junior engineer & CEIG safety compliance inspection.' },
  { stageKey: 'subsidy_apply', stageName: 'Subsidy Apply', order: 23, lifecyclePhase: 'subsidy', description: 'Direct Benefit Transfer (DBT) subsidy application submitted.' },
  { stageKey: 'warranty_issued', stageName: 'Warranty Issued', order: 24, lifecyclePhase: 'warranty', description: '25-year panel performance & 5-year inverter warranty issued.' },
  { stageKey: 'invoice_file', stageName: 'Invoice File', order: 25, lifecyclePhase: 'invoice', description: 'GST final tax invoice file generation and customer reconciliation.' },
  { stageKey: 'subsidy_redeemed', stageName: 'Subsidy Redeemed', order: 26, lifecyclePhase: 'subsidy', description: 'Final subsidy credited to consumer account; project closure.' },
];

/**
 * Creates the default 26 operational stages for a newly onboarded project.
 */
export function initializeProjectStages(preset?: {
  applicationType?: string;
  paymentMode?: string;
  assignedUser?: { userId: string; name: string; role: string };
}): ProjectStageItem[] {
  const now = new Date().toISOString();

  return CANONICAL_OPERATIONAL_STAGES.map((def) => {
    let initialStatus: StageStatus = 'not_started';
    let remarks = '';

    // Tailor initial status based on customer onboarding presets
    if (def.stageKey === 'brown_file') {
      if (preset?.applicationType === 'brown_file') {
        initialStatus = 'in_progress';
        remarks = 'Brown file documentation initiated upon onboarding';
      } else if (preset?.applicationType && preset.applicationType !== 'brown_file') {
        initialStatus = 'not_applicable';
      }
    } else if (def.stageKey === 'new_connection') {
      if (preset?.applicationType === 'new_connection') {
        initialStatus = 'in_progress';
      } else if (preset?.applicationType && preset.applicationType !== 'new_connection') {
        initialStatus = 'not_applicable';
      }
    } else if (def.stageKey === 'jan_samarth_loan') {
      if (preset?.paymentMode === 'jan_samarth_loan') {
        initialStatus = 'in_progress';
        remarks = 'Jan Samarth digital verification pending';
      } else if (preset?.paymentMode && preset.paymentMode !== 'jan_samarth_loan') {
        initialStatus = 'not_applicable';
      }
    } else if (def.stageKey === 'cash') {
      if (preset?.paymentMode === 'cash') {
        initialStatus = 'completed';
        remarks = 'Upfront booking payment confirmed';
      } else if (preset?.paymentMode === 'jan_samarth_loan' || preset?.paymentMode === 'loan') {
        initialStatus = 'not_applicable';
      }
    } else if (def.stageKey === 'vendor_to_be_changed') {
      initialStatus = 'not_applicable'; // only activated if vendor swap occurs
    }

    return {
      id: `stage-${def.stageKey}-${crypto.randomBytes(3).toString('hex')}`,
      stageKey: def.stageKey,
      stageName: def.stageName,
      order: def.order,
      lifecyclePhase: def.lifecyclePhase,
      status: initialStatus,
      completionDate: initialStatus === 'completed' ? now.split('T')[0] : null,
      updatedBy: preset?.assignedUser,
      updatedAt: now,
      remarks,
      documents: [],
    };
  });
}

/**
 * Creates a stage history entry without overwriting past history.
 */
export function createStageHistoryRecord(params: {
  projectId: string;
  stageKey: string;
  stageName: string;
  previousStatus: StageStatus;
  newStatus: StageStatus;
  changedByUserId: string;
  changedByUserName: string;
  changedByUserRole: string;
  remarks?: string;
}): ProjectStageHistoryEntry {
  return {
    id: `hist-${crypto.randomBytes(6).toString('hex')}`,
    projectId: params.projectId,
    stageKey: params.stageKey,
    stageName: params.stageName,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    changedByUserId: params.changedByUserId,
    changedByUserName: params.changedByUserName,
    changedByUserRole: params.changedByUserRole,
    remarks: params.remarks || `Status transitioned from ${params.previousStatus} to ${params.newStatus}`,
    timestamp: new Date().toISOString(),
  };
}
