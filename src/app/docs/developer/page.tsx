import * as React from 'react';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Alert from '@mui/material/Alert';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LiveHelpRoundedIcon from '@mui/icons-material/LiveHelpRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import DashboardCustomizeRoundedIcon from '@mui/icons-material/DashboardCustomizeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';

function highlightJson(code: string): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/(".*?")(\s*:)/g, '<span style="color:#8ab4f8">$1</span>$2')
    .replace(/:\s(".*?")/g, ': <span style="color:#a5d6a7">$1</span>')
    .replace(/\b(true|false|null)\b/g, '<span style="color:#ffcc80">$1</span>')
    .replace(/:\s(-?\d+(\.\d+)?)/g, ': <span style="color:#f48fb1">$1</span>');
}

function highlightHandlebars(code: string): string {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/(\{\{.*?\}\})/g, '<span style="color:#ffcc80">$1</span>')
    .replace(/(&lt;\/?[a-zA-Z0-9-]+.*?&gt;)/g, '<span style="color:#8ab4f8">$1</span>');
}

function CodeBlock({
  code,
  mode = 'json',
}: {
  code: string;
  mode?: 'json' | 'hbs';
}) {
  const highlighted = mode === 'json' ? highlightJson(code) : highlightHandlebars(code);
  return (
    <Box
      component="pre"
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#0f172a',
        color: '#e5e7eb',
        overflowX: 'auto',
        fontSize: { xs: '0.85rem', md: '0.9rem' },
        lineHeight: 1.6,
      }}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.01em' }}>
      {children}
    </Typography>
  );
}

export default function DocsDeveloperPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            borderColor: 'divider',
            background: 'linear-gradient(135deg, rgba(25,118,210,0.12) 0%, rgba(255,255,255,0.96) 60%)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip icon={<CodeRoundedIcon />} label="Developer Guide" />
              <Chip icon={<SecurityRoundedIcon />} label="Security-aware" variant="outlined" />
              <Chip icon={<SettingsSuggestRoundedIcon />} label="Override-driven customization" variant="outlined" />
            </Stack>
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-0.03em', fontSize: { xs: '1.9rem', md: '2.4rem' } }}>
                Customize safely, ship faster
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                Use the built-in Overrides Editor to customize per-company UI, templates, and workflows with a safe,
                role-protected developer experience.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button component={Link} href="/docs/users" variant="outlined">
                Open User Tutorials
              </Button>
            </Stack>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Access the Overrides Editor manually from the developer route. This guide focuses on safe usage patterns and examples.
            </Alert>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, flex: 1, boxShadow: '0 3px 14px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoFixHighRoundedIcon fontSize="small" />
              Quick start checklist
            </Typography>
            <ol style={{ marginTop: 10, marginBottom: 0, paddingLeft: 20 }}>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Open editor and select target file from tree view.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Edit JSON/template content and validate format.
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Save and verify the affected UI/workflow behavior.
                </Typography>
              </li>
            </ol>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, flex: 1, boxShadow: '0 3px 14px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TerminalRoundedIcon fontSize="small" />
              Capability overview
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {[
                'Monaco editor with syntax-aware editing and tabs',
                'Tree-based file explorer for folders/files',
                'JSON formatting and validation feedback',
                'Sandboxed terminal for company override files',
              ].map((item) => (
                <Typography key={item} variant="body2" color="text.secondary">
                  - {item}
                </Typography>
              ))}
            </Stack>
          </Paper>
        </Stack>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={900}>
            Popular developer topics
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
            <Button href="#where-to-edit" size="small" variant="outlined">
              Where to edit
            </Button>
            <Button href="#file-types" size="small" variant="outlined">
              File types
            </Button>
            <Button href="#examples" size="small" variant="outlined">
              Config examples
            </Button>
            <Button href="#validation-safety" size="small" variant="outlined">
              Validation & safety
            </Button>
            <Button href="#troubleshooting" size="small" variant="outlined">
              Troubleshooting
            </Button>
          </Stack>
        </Paper>

        <Paper id="where-to-edit" variant="outlined" sx={{ p: 3, borderRadius: 3, scrollMarginTop: 96 }}>
          <SectionTitle>Where to edit</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            If you have the correct role, use the developer route to access the Overrides Editor.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Changes apply only to your organization (company). They do not affect other companies.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>File browser and editor controls</SectionTitle>
          <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
            The left side is a folder/file tree. The editor uses tabs, so you can keep multiple files open.
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={800}>
              Common actions
            </Typography>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              <li>Open a file by clicking it in the tree.</li>
              <li>Use the JSON “Format” action for readable JSON.</li>
              <li>Use “Save” to write changes for the active file.</li>
              <li>Use “Save All” to save every modified tab.</li>
              <li>Delete an override to return back to the default behavior for that file.</li>
            </ul>
          </Box>
        </Paper>

        <Paper id="file-types" variant="outlined" sx={{ p: 3, borderRadius: 3, scrollMarginTop: 96 }}>
          <SectionTitle>What you can modify (file types)</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The editor supports these main file categories:
          </Typography>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>
              <code>ui/*.json</code>: theming, navigation structure, and dashboard layout behavior.
            </li>
            <li>
              <code>templates/**/*.hbs</code>: UI/Email template files (Handlebars).
            </li>
            <li>
              <code>workflows/*.json</code>: workflow configuration rules.
            </li>
            <li>
              <code>.txt</code> (and other plain text): stored as plain text.
            </li>
          </ul>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Only the parts of the app that are wired to read these overrides will change.
          </Typography>
        </Paper>

        <Paper id="examples" variant="outlined" sx={{ p: 3, borderRadius: 3, scrollMarginTop: 96 }}>
          <SectionTitle>Example: `ui/theme.json`</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This file can control branding, palette colors, shape, and typography. You should keep it valid JSON.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Chip size="small" icon={<PaletteRoundedIcon />} label="Theme config" />
            <Chip size="small" variant="outlined" label="JSON highlighted" />
          </Stack>
          <CodeBlock
            code={`{
  "brand": { "name": "Thinking Minds", "logoUrl": "/logo.png" },
  "palette": { "primary": "#0AA775", "secondary": "#1976d2" },
  "shape": { "borderRadius": 12 },
  "typography": { "fontFamily": "Inter, system-ui, sans-serif" }
}`}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Tip: change only a few keys at a time, then save and refresh so you can isolate what caused the UI update.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Example: `ui/navigation.json`</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Use this file to define navigation sections and items. The app will filter what users can see based on
            roles/assigned modules.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Chip size="small" icon={<AccountTreeRoundedIcon />} label="Navigation map" />
            <Chip size="small" variant="outlined" label="JSON highlighted" />
          </Stack>
          <CodeBlock
            code={`{
  "sections": [
    {
      "id": "system",
      "title": "System",
      "items": [
        { "id": "dev", "title": "Developer Overrides", "path": "/admin/dev", "enabled": true }
      ]
    }
  ]
}`}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Tip: make sure each item’s <code>path</code> matches a real route, and keep <code>enabled</code> to control visibility.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Example: `ui/dashboard.layout.json`</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This file controls what dashboard widgets are shown.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Chip size="small" icon={<DashboardCustomizeRoundedIcon />} label="Dashboard layout" />
            <Chip size="small" variant="outlined" label="JSON highlighted" />
          </Stack>
          <CodeBlock
            code={`{
  "cards": {
    "stats": true,
    "quickNavigation": true,
    "topRef": true
  }
}`}
          />
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Example: Handlebars templates (`templates/*.hbs`)</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Templates are stored as text and can use Handlebars syntax. Only provide values your app actually passes in.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Chip size="small" icon={<DescriptionRoundedIcon />} label="Template" />
            <Chip size="small" variant="outlined" label="Handlebars highlighted" />
          </Stack>
          <CodeBlock
            mode="hbs"
            code={`<h1>Invoice {{invoice.number}}</h1>
<p>Customer: {{customer.name}}</p>
<p>Total: {{invoice.total}}</p>`}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            If you break the template syntax, the app may fail to render that template. Prefer small changes and verify output.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Example: workflows (`workflows/*.json`)</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Workflows define rules that the app can apply (for example: approvals based on amounts or roles).
          </Typography>
          <CodeBlock
            code={`{
  "invoiceApproval": {
    "rules": [
      {
        "id": "highAmount",
        "when": { "gt": ["amount", 5000] },
        "requireRole": "FinanceManager"
      }
    ]
  }
}`}
          />
        </Paper>

        <Paper id="validation-safety" variant="outlined" sx={{ p: 3, borderRadius: 3, scrollMarginTop: 96 }}>
          <SectionTitle>Validation and safety</SectionTitle>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>
              JSON files are validated on save. If the JSON is invalid, the editor will not save it.
            </li>
            <li>
              The terminal tool (if enabled) runs in a sandbox for inspecting your company’s override files only.
              Do not use it to handle secrets.
            </li>
          </ul>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <SectionTitle>Editing workflow (recommended)</SectionTitle>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>Pick the file you want to change (start with <code>ui/theme.json</code> or <code>ui/navigation.json</code>).</li>
            <li>If it’s JSON, click <strong>Format</strong> to keep it readable.</li>
            <li>Click <strong>Save</strong> (or <strong>Save All</strong>) and fix any validation errors.</li>
            <li>Refresh the affected page and confirm the behavior is what you expect.</li>
            <li>If something goes wrong, delete the override file to fall back to the default content.</li>
          </ul>
        </Paper>

        <Paper id="troubleshooting" variant="outlined" sx={{ p: 3, borderRadius: 3, scrollMarginTop: 96 }}>
          <SectionTitle>Troubleshooting</SectionTitle>
          <ul style={{ marginTop: 8, marginBottom: 0 }}>
            <li>
              If changes don’t appear, make sure you clicked “Save” (or “Save All”) and refresh the page.
            </li>
            <li>
              If a file is JSON and you see save errors, fix the JSON syntax and save again.
            </li>
            <li>
              If you deleted an override and the default doesn’t match what you expect, re-create the file and save
              it.
            </li>
          </ul>
        </Paper>

        <Accordion disableGutters sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LiveHelpRoundedIcon fontSize="small" />
              Developer FAQ
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  Why are my changes not visible?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Save first, then refresh the target page. Also confirm you edited the correct override file category.
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  Can I use terminal commands freely?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No. Terminal use is sandboxed and limited. Keep it for inspecting/validating company override files.
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  What is the safest way to roll out changes?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Make small edits, save, verify behavior, then continue. If needed, remove override to fall back to defaults.
                </Typography>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Container>
  );
}

