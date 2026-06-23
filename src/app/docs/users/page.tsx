import * as React from 'react';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ComputerRoundedIcon from '@mui/icons-material/ComputerRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';

const MODULE_TITLES = [
  'Dashboard',
  'POS',
  'Finance',
  'Inventory',
  'Procurement',
  'Tasks',
  'CRM',
  'HR',
  'Payroll',
  'IT',
  'Helpdesk',
  'Reports',
  'Audit',
  'Logs',
  'Notifications',
  'Currency',
];

function toAnchorId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.01em' }}>
      {children}
    </Typography>
  );
}

function ModuleCard({
  title,
  icon,
  purpose,
  whenToUse,
  commonTasks,
  tutorialSteps,
  commonMistakes,
  bestPractices,
}: {
  title: string;
  icon: React.ReactNode;
  purpose: string;
  whenToUse: string;
  commonTasks: string[];
  tutorialSteps: string[];
  commonMistakes: string[];
  bestPractices: string[];
}) {
  const sectionId = toAnchorId(title);

  return (
    <Accordion
      id={sectionId}
      disableGutters
      defaultExpanded={title === 'Inventory'}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 2px 14px rgba(0,0,0,0.04)',
        '&:before': { display: 'none' },
        scrollMarginTop: 96,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${sectionId}-content`}
        id={`${sectionId}-header`}
        sx={{ px: { xs: 2, md: 2.5 }, py: 0.5 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ display: 'inline-flex', p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(10,167,117,0.14)' }}>
            {icon}
          </Box>
          <Box>
          <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.01em', fontSize: { xs: '1.02rem', md: '1.1rem' } }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {purpose}
          </Typography>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: { xs: 2, md: 2.5 }, pb: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>When to use:</strong> {whenToUse}
        </Typography>
        <Typography variant="body2" fontWeight={800} sx={{ mt: 2 }}>
          What you can do
        </Typography>
        <ul style={{ marginTop: 8, marginBottom: 0 }}>
          {commonTasks.map((task) => (
            <li key={`${title}-${task}`}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 17, mt: 0.25, color: 'success.main' }} />
                <span>{task}</span>
              </Box>
            </li>
          ))}
        </ul>
        <Typography variant="body2" fontWeight={800} sx={{ mt: 2 }}>
          Quick tutorial
        </Typography>
        <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
          {tutorialSteps.map((step) => (
            <li key={`${title}-${step}`}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TaskAltRoundedIcon sx={{ fontSize: 17, mt: 0.25, color: 'primary.main' }} />
                <span>{step}</span>
              </Box>
            </li>
          ))}
        </ol>
        <Typography variant="body2" fontWeight={800} sx={{ mt: 2 }}>
          Common mistakes to avoid
        </Typography>
        <ul style={{ marginTop: 8, marginBottom: 0 }}>
          {commonMistakes.map((mistake) => (
            <li key={`${title}-${mistake}`}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <ErrorOutlineRoundedIcon sx={{ fontSize: 17, mt: 0.25, color: 'warning.main' }} />
                <span>{mistake}</span>
              </Box>
            </li>
          ))}
        </ul>
        <Typography variant="body2" fontWeight={800} sx={{ mt: 2 }}>
          Best-practice checklist
        </Typography>
        <ul style={{ marginTop: 8, marginBottom: 0 }}>
          {bestPractices.map((practice) => (
            <li key={`${title}-${practice}`}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TaskAltRoundedIcon sx={{ fontSize: 17, mt: 0.25, color: 'success.dark' }} />
                <span>{practice}</span>
              </Box>
            </li>
          ))}
        </ul>
      </AccordionDetails>
    </Accordion>
  );
}

export default function DocsUsersPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            borderColor: 'divider',
            background: 'linear-gradient(135deg, rgba(10,167,117,0.14) 0%, rgba(255,255,255,0.96) 60%)',
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip icon={<MenuBookRoundedIcon />} label="User Tutorials" />
              <Chip icon={<SchoolRoundedIcon />} label="Module-by-module learning" variant="outlined" />
              <Chip icon={<SecurityRoundedIcon />} label="Security-safe guidance" variant="outlined" />
            </Stack>
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-0.03em', fontSize: { xs: '1.85rem', md: '2.5rem' } }}>
                Master daily operations faster
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                Step-by-step tutorials for each module, including practical workflows, common mistakes, and best-practice checklists.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button href="#inventory" variant="contained" startIcon={<AutoAwesomeRoundedIcon />}>
                Start with inventory
              </Button>
              <Button href="#dashboard" variant="outlined">
                Open module index
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Before you start</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            If you do not see one of the modules below in your menu, your account may not have access to it yet.
          </Typography>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>Owners typically have full access to all modules.</li>
            <li>Other users only see assigned modules.</li>
            <li>Some screens may look different between organizations because of per-company customization.</li>
          </ul>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Quick module index</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Jump directly to a tutorial section:
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            {MODULE_TITLES.map((moduleTitle) => (
              <Link
                key={moduleTitle}
                href={`#${toAnchorId(moduleTitle)}`}
                underline="hover"
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  fontSize: '0.875rem',
                }}
              >
                {moduleTitle}
              </Link>
            ))}
          </Box>
        </Paper>

        <ModuleCard
          title="Dashboard"
          icon={<DashboardRoundedIcon fontSize="small" />}
          purpose="Your landing view with high-level metrics, quick navigation, and top references."
          whenToUse="Start here each day to understand what needs attention first."
          commonTasks={[
            'Review top stats and trend indicators.',
            'Use quick links to jump to your most-used modules.',
            'Spot anomalies early before drilling into details.',
          ]}
          tutorialSteps={[
            'Open the dashboard and scan the top cards.',
            'Identify unusual values (spikes, drops, warnings).',
            'Use quick navigation cards to open the relevant work module.',
            'Return to dashboard after updates to verify improvements.',
          ]}
          commonMistakes={[
            'Ignoring warning trends because totals still look normal.',
            'Working from stale numbers without refreshing.',
            'Jumping into details without first identifying priority metrics.',
          ]}
          bestPractices={[
            'Start each shift by checking dashboard exceptions first.',
            'Use dashboard cards to guide your work order for the day.',
            'Re-check key metrics after completing major actions.',
          ]}
        />

        <ModuleCard
          title="POS"
          icon={<PointOfSaleRoundedIcon fontSize="small" />}
          purpose="Point-of-sale operations for daily sales and checkout workflows."
          whenToUse="Use during customer checkout and sales processing."
          commonTasks={[
            'Create a sale and add line items.',
            'Apply customer/payment details during checkout.',
            'Review completed transactions and totals.',
          ]}
          tutorialSteps={[
            'Create a new order/sale transaction and select the customer if needed.',
            'Add products/services and confirm quantities/pricing.',
            'Capture payment details and complete checkout.',
            'Verify the sale appears in your transaction history.',
          ]}
          commonMistakes={[
            'Completing checkout without confirming quantity and price.',
            'Skipping payment verification before finalizing.',
            'Not checking that a completed sale appears in history.',
          ]}
          bestPractices={[
            'Confirm item totals with the customer before payment.',
            'Recheck payment method and amount before submit.',
            'Review end-of-day totals against completed transactions.',
          ]}
        />

        <ModuleCard
          title="Finance"
          icon={<AccountBalanceWalletRoundedIcon fontSize="small" />}
          purpose="Financial records, summaries, and transaction-level visibility."
          whenToUse="Use for monitoring financial health and validating transactions."
          commonTasks={[
            'Track income, expenses, and balances.',
            'Review account activity for a period.',
            'Use finance views before approvals or reporting.',
          ]}
          tutorialSteps={[
            'Select the period you want to review.',
            'Compare income vs expenses and check balances.',
            'Drill into unusual transactions for details.',
            'Use results to prepare approvals or reporting decisions.',
          ]}
          commonMistakes={[
            'Comparing periods with different date ranges.',
            'Approving decisions without reviewing outlier transactions.',
            'Treating one-time spikes as normal trends.',
          ]}
          bestPractices={[
            'Always confirm the period filter before analysis.',
            'Investigate top anomalies before closing review.',
            'Capture notes on findings for audit and handover.',
          ]}
        />

        <ModuleCard
          title="Inventory"
          icon={<Inventory2RoundedIcon fontSize="small" />}
          purpose="Manage stock levels, item movement, and replenishment decisions."
          whenToUse="Use whenever you receive stock, sell stock, or reconcile availability."
          commonTasks={[
            'Add new inventory items and maintain item details.',
            'Track on-hand stock, movement history, and low-stock thresholds.',
            'Trigger reorders and coordinate with suppliers.',
            'Verify received stock and reconcile counts.',
          ]}
          tutorialSteps={[
            'Create or open an item record, then confirm SKU/name/unit and reorder threshold.',
            'When adding stock, post the quantity update and include a clear reason (new delivery, correction, return).',
            'Review low-stock items daily and select items that reached or dropped below reorder level.',
            'Start a reorder request by selecting supplier, expected quantity, and expected delivery window.',
            'After stock arrives, receive the delivery in system and match received quantity against requested quantity.',
            'Reconcile differences immediately and confirm final on-hand quantity is correct.',
          ]}
          commonMistakes={[
            'Updating quantity without a movement reason, making audit trails unclear.',
            'Reordering too late because thresholds are not maintained per item.',
            'Receiving stock in the system without physically validating delivered quantity.',
            'Mixing supplier details across similar items and causing wrong reorders.',
          ]}
          bestPractices={[
            'Set reorder thresholds per item based on real consumption rate.',
            'Keep supplier information complete (contact, lead time, preferred status).',
            'Use a daily low-stock review routine to avoid stockouts.',
            'Always perform receive-and-reconcile before closing a purchase cycle.',
          ]}
        />

        <ModuleCard
          title="Procurement"
          icon={<ShoppingCartCheckoutRoundedIcon fontSize="small" />}
          purpose="Purchase and supplier workflows."
          whenToUse="Use when your team needs to source items or services."
          commonTasks={[
            'Create and track purchase activities.',
            'Follow approval/procurement status.',
            'Coordinate procurement with inventory and finance teams.',
          ]}
          tutorialSteps={[
            'Create a purchase order/procurement request with required items and supplier details.',
            'Submit for review/approval based on your process.',
            'Track status until approved and fulfilled.',
            'Confirm related inventory/finance updates are reflected.',
          ]}
          commonMistakes={[
            'Submitting requests with incomplete quantity or supplier details.',
            'Skipping status follow-up after approval.',
            'Closing procurement before confirming delivery/financial impact.',
          ]}
          bestPractices={[
            'Include clear specifications and required dates in each request.',
            'Track pending requests daily until fulfilled.',
            'Cross-check procurement completion with inventory and finance records.',
          ]}
        />

        <ModuleCard
          title="Tasks"
          icon={<AssignmentTurnedInRoundedIcon fontSize="small" />}
          purpose="Task planning, assignment, and progress tracking."
          whenToUse="Use for managing personal/team work and follow-ups."
          commonTasks={[
            'Create or review tasks assigned to you.',
            'Open task details and update status.',
            'Use task views to prioritize daily work.',
          ]}
          tutorialSteps={[
            'Create a task with a clear title, owner, and due date.',
            'Track progress by updating status regularly.',
            'Use task details/comments for handovers and context.',
            'Close tasks only after confirming completion criteria.',
          ]}
          commonMistakes={[
            'Creating tasks without owners or due dates.',
            'Leaving tasks open after completion.',
            'Not documenting blockers in task notes.',
          ]}
          bestPractices={[
            'Use clear, action-oriented task titles.',
            'Update status as soon as work state changes.',
            'Capture handover context in comments before reassignment.',
          ]}
        />

        <ModuleCard
          title="CRM"
          icon={<GroupsRoundedIcon fontSize="small" />}
          purpose="Customer relationship workflows and related records."
          whenToUse="Use when handling customer interactions, follow-ups, and account context."
          commonTasks={[
            'View customer records and interaction history.',
            'Update customer-related activity as work progresses.',
            'Use CRM context during sales/follow-up steps.',
          ]}
          tutorialSteps={[
            'Find the customer record you are working on.',
            'Review previous interactions and current status.',
            'Log your latest activity and next action.',
            'Schedule/track follow-up to keep engagement active.',
          ]}
          commonMistakes={[
            'Failing to log interaction outcomes immediately.',
            'Skipping next-action dates after customer contact.',
            'Using inconsistent customer data across records.',
          ]}
          bestPractices={[
            'Update customer records right after each interaction.',
            'Always set the next follow-up action and date.',
            'Keep customer notes concise, factual, and timeline-based.',
          ]}
        />

        <ModuleCard
          title="HR"
          icon={<BadgeRoundedIcon fontSize="small" />}
          purpose="Human resources workflows, records, and personnel operations."
          whenToUse="Use for employee-related actions and record maintenance."
          commonTasks={[
            'Review employee-related records and statuses.',
            'Process HR actions according to your role.',
            'Coordinate HR workflows with payroll and approvals.',
          ]}
          tutorialSteps={[
            'Open the relevant employee record or HR request.',
            'Validate required information before actioning.',
            'Complete the HR action and update status.',
            'Confirm downstream impact (for example payroll updates).',
          ]}
          commonMistakes={[
            'Processing HR actions with missing employee data.',
            'Forgetting to update status after approval/action.',
            'Not notifying linked teams for downstream changes.',
          ]}
          bestPractices={[
            'Verify documents and required fields before processing.',
            'Record the action date and owner for traceability.',
            'Coordinate with payroll when HR changes affect compensation.',
          ]}
        />

        <ModuleCard
          title="Payroll"
          icon={<PaymentsRoundedIcon fontSize="small" />}
          purpose="Payroll operations and compensation-related views."
          whenToUse="Use during payroll preparation, validation, and review cycles."
          commonTasks={[
            'Review payroll cycles and relevant records.',
            'Validate payroll inputs before finalization.',
            'Cross-check payroll details with HR/finance information.',
          ]}
          tutorialSteps={[
            'Open the current payroll cycle.',
            'Validate employee/pay entries and adjustments.',
            'Cross-check totals with HR and finance data.',
            'Finalize only after resolving discrepancies.',
          ]}
          commonMistakes={[
            'Finalizing payroll with unresolved discrepancies.',
            'Applying manual adjustments without notes.',
            'Skipping HR cross-check for personnel changes.',
          ]}
          bestPractices={[
            'Run a pre-finalization validation checklist every cycle.',
            'Document all adjustments with reason and approver.',
            'Reconcile totals with finance before close.',
          ]}
        />

        <ModuleCard
          title="IT"
          icon={<ComputerRoundedIcon fontSize="small" />}
          purpose="Internal IT/support operations and technology-related tasks."
          whenToUse="Use for operational IT requests and technology task tracking."
          commonTasks={[
            'Track IT-related activities assigned to your team.',
            'Monitor issue handling and technical follow-ups.',
            'Coordinate with Helpdesk for support workflows.',
          ]}
          tutorialSteps={[
            'Review incoming IT tasks or requests.',
            'Prioritize by urgency and business impact.',
            'Update status and notes as work progresses.',
            'Close after confirming issue resolution with the requester.',
          ]}
          commonMistakes={[
            'Prioritizing by arrival time only, not impact.',
            'Closing technical tasks without requester confirmation.',
            'Leaving troubleshooting details undocumented.',
          ]}
          bestPractices={[
            'Classify issues by urgency and operational risk.',
            'Keep progress notes clear for team visibility.',
            'Confirm resolution with end user before closure.',
          ]}
        />

        <ModuleCard
          title="Helpdesk"
          icon={<SupportAgentRoundedIcon fontSize="small" />}
          purpose="Issue/ticket support workflows."
          whenToUse="Use for reporting, triaging, and resolving support issues."
          commonTasks={[
            'View and manage support tickets you can access.',
            'Track ticket status from open to resolution.',
            'Escalate or route issues to relevant teams.',
          ]}
          tutorialSteps={[
            'Create or open a ticket with clear issue details.',
            'Assign priority and owner.',
            'Track updates and communicate progress.',
            'Resolve and close once the user confirms fix.',
          ]}
          commonMistakes={[
            'Creating vague ticket descriptions without impact details.',
            'Not updating users while ticket is in progress.',
            'Closing tickets before validation by requester.',
          ]}
          bestPractices={[
            'Capture symptom, impact, and expected behavior in ticket.',
            'Maintain regular status communication on active tickets.',
            'Use closure notes to record final fix steps.',
          ]}
        />

        <ModuleCard
          title="Reports"
          icon={<BarChartRoundedIcon fontSize="small" />}
          purpose="Cross-module reporting and analytics views."
          whenToUse="Use for weekly/monthly reviews and decision support."
          commonTasks={[
            'Open module-specific reports.',
            'Compare operational and financial metrics.',
            'Use reports to support decisions and audits.',
          ]}
          tutorialSteps={[
            'Select report type and date range.',
            'Compare key metrics across teams/modules.',
            'Investigate outliers using drill-down views.',
            'Share findings and action points with stakeholders.',
          ]}
          commonMistakes={[
            'Using wrong date range and misreading trends.',
            'Sharing report outputs without context or actions.',
            'Ignoring drill-down when numbers look abnormal.',
          ]}
          bestPractices={[
            'Validate filters before exporting or sharing.',
            'Pair each report with short interpretation notes.',
            'Track follow-up actions from report findings.',
          ]}
        />

        <ModuleCard
          title="Audit"
          icon={<FactCheckRoundedIcon fontSize="small" />}
          purpose="Audit-oriented views for traceability and compliance checks."
          whenToUse="Use when validating process compliance and historical activity."
          commonTasks={[
            'Review activity trails and operational evidence.',
            'Use audit views during compliance reviews.',
            'Cross-check records with reports/logs when needed.',
          ]}
          tutorialSteps={[
            'Define the process/time period under review.',
            'Inspect audit trail entries for key actions.',
            'Cross-check related records from other modules.',
            'Document findings and required corrective actions.',
          ]}
          commonMistakes={[
            'Running audits without a clear scope.',
            'Reviewing events without cross-checking source records.',
            'Failing to document corrective actions.',
          ]}
          bestPractices={[
            'Define timeframe, process scope, and owner before audit.',
            'Capture evidence references for each finding.',
            'Track remediation items to completion.',
          ]}
        />

        <ModuleCard
          title="Logs"
          icon={<ReceiptLongRoundedIcon fontSize="small" />}
          purpose="System and operational logs for diagnostics and monitoring."
          whenToUse="Use when troubleshooting incidents or unusual behavior."
          commonTasks={[
            'Inspect recent activity when troubleshooting.',
            'Share relevant log context with technical teams.',
            'Track recurring issues over time.',
          ]}
          tutorialSteps={[
            'Filter logs by timeframe and relevant context.',
            'Locate errors/warnings related to the issue.',
            'Capture key log lines and share with support/developers.',
            'Recheck logs after fix to confirm stability.',
          ]}
          commonMistakes={[
            'Looking at broad logs without filtering context.',
            'Sharing logs without timestamp or event context.',
            'Stopping investigation after first error line.',
          ]}
          bestPractices={[
            'Filter first, then inspect patterns over time.',
            'Include timestamp and correlation context when escalating.',
            'Verify error disappearance after fix deployment.',
          ]}
        />

        <ModuleCard
          title="Notifications"
          icon={<NotificationsRoundedIcon fontSize="small" />}
          purpose="Updates and alerts relevant to your assigned workflows."
          whenToUse="Use to track pending actions and stay updated."
          commonTasks={[
            'Review recent alerts and announcements.',
            'Open related modules from a notification context.',
            'Use notifications to follow pending actions quickly.',
          ]}
          tutorialSteps={[
            'Check notifications at the start of your day.',
            'Open high-priority alerts first.',
            'Complete linked actions in the relevant module.',
            'Revisit notifications to ensure nothing is pending.',
          ]}
          commonMistakes={[
            'Ignoring repeated alerts for the same workflow.',
            'Reading notifications without completing linked actions.',
            'Letting low-priority items hide urgent alerts.',
          ]}
          bestPractices={[
            'Triage alerts by urgency at fixed times daily.',
            'Clear notifications only after action is completed.',
            'Escalate unresolved critical alerts quickly.',
          ]}
        />

        <ModuleCard
          title="Currency"
          icon={<CurrencyExchangeRoundedIcon fontSize="small" />}
          purpose="Currency-related settings and reference information."
          whenToUse="Use when working with multi-currency records and finance/report checks."
          commonTasks={[
            'Review supported currency settings in your environment.',
            'Confirm currency context for finance/report workflows.',
            'Coordinate updates with finance owners when needed.',
          ]}
          tutorialSteps={[
            'Confirm active currency context before processing records.',
            'Validate values in finance and report views.',
            'Escalate currency setup changes to authorized owners.',
            'Recheck affected records after any currency change.',
          ]}
          commonMistakes={[
            'Processing records in wrong currency context.',
            'Comparing values without checking currency basis.',
            'Applying unauthorized currency setting changes.',
          ]}
          bestPractices={[
            'Confirm currency context before approvals or entries.',
            'Annotate reports when comparing across currencies.',
            'Route currency configuration changes to owner/finance lead.',
          ]}
        />

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Admin module (owner only)</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Admin is restricted to owners. It is used for user management and access configuration.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Requesting changes</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            If something should be changed, send a clear request to your owner/developer.
          </Typography>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>Share the module name (example: “Finance”).</li>
            <li>Describe expected behavior and what currently happens.</li>
            <li>Attach screenshots when possible.</li>
            <li>Do not include secrets in tickets/messages.</li>
          </ul>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Overrides and customization (user view)</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Your organization can have customized branding, navigation, templates, and workflows. These changes are
            isolated to your organization and do not affect other companies using the platform.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Security note</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Developer tools are protected by roles. This documentation intentionally avoids sensitive implementation details.
            Please do not attempt to access hidden developer functionality via direct URLs unless you have the correct role.
          </Typography>
        </Paper>
      </Stack>
    </Container>
  );
}

