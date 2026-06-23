import * as React from 'react';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Link from 'next/link';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import LiveHelpRoundedIcon from '@mui/icons-material/LiveHelpRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import BuildCircleRoundedIcon from '@mui/icons-material/BuildCircleRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

export default function DocsHomePage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={2.5}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            borderColor: 'divider',
            background: 'linear-gradient(135deg, rgba(25,118,210,0.12) 0%, rgba(255,255,255,0.96) 60%)',
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip icon={<MenuBookRoundedIcon />} label="Documentation Hub" />
              <Chip icon={<VerifiedUserRoundedIcon />} label="Security-safe guidance" variant="outlined" />
              <Chip icon={<SchoolRoundedIcon />} label="Practical tutorials" variant="outlined" />
            </Stack>
            <Box>
              <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-0.03em', fontSize: { xs: '1.9rem', md: '2.6rem' } }}>
                Learn the system fast
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                Use this documentation center to understand features, onboard teams, and follow step-by-step workflows
                for each module.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <Button component={Link} href="/docs/users" variant="contained" startIcon={<PlayCircleOutlineRoundedIcon />}>
                Start user tutorials
              </Button>
              <Button component={Link} href="/docs/developer" variant="outlined" startIcon={<AutoStoriesRoundedIcon />}>
                Open developer docs
              </Button>
            </Stack>
            <Paper
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: 2.5,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <SearchRoundedIcon sx={{ fontSize: 16 }} />
                Quick tip: start with User Guide for daily workflows, then open Developer Guide when customization is needed.
              </Typography>
            </Paper>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, flex: 1 }}>
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupsRoundedIcon fontSize="small" />
              Choose your path
            </Typography>
            <Stack spacing={1.25} sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <PersonRoundedIcon sx={{ mt: 0.1, fontSize: 18 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Users:</strong> Follow module tutorials to run day-to-day operations confidently.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <BuildCircleRoundedIcon sx={{ mt: 0.1, fontSize: 18 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Developers:</strong> Use override guides for theme, navigation, templates, and workflows.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <ManageAccountsRoundedIcon sx={{ mt: 0.1, fontSize: 18 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Owners:</strong> Combine both guides for access management and controlled customization.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, flex: 1 }}>
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChecklistRoundedIcon fontSize="small" />
              What this docs hub includes
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {[
                'Step-by-step tutorials for each module',
                'Common mistakes and best-practice checklists',
                'Onboarding guidance for new team members',
                'Security-safe docs without sensitive internals',
              ].map((item) => (
                <Typography key={item} variant="body2" color="text.secondary" sx={{ display: 'flex', gap: 1 }}>
                  <CheckCircleOutlineRoundedIcon sx={{ fontSize: 18, mt: 0.1 }} />
                  {item}
                </Typography>
              ))}
            </Stack>
          </Paper>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'inline-flex', p: 1, borderRadius: 2, bgcolor: 'rgba(25,118,210,0.12)', mb: 1.5 }}>
                <PlayCircleOutlineRoundedIcon />
              </Box>
              <Typography fontWeight={800}>Step-by-step tutorials</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Learn module-by-module with practical workflows, common mistakes, and best-practice checklists.
              </Typography>
            </Paper>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'inline-flex', p: 1, borderRadius: 2, bgcolor: 'rgba(46,125,50,0.12)', mb: 1.5 }}>
                <VerifiedUserRoundedIcon />
              </Box>
              <Typography fontWeight={800}>Role-aware guidance</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Content is safe, non-sensitive, and designed for both regular users and developer/owner workflows.
              </Typography>
            </Paper>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'inline-flex', p: 1, borderRadius: 2, bgcolor: 'rgba(2,136,209,0.12)', mb: 1.5 }}>
                <InsightsRoundedIcon />
              </Box>
              <Typography fontWeight={800}>Fast onboarding</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                New team members can quickly understand daily operations and where to find help when needed.
              </Typography>
            </Paper>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 3,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoStoriesRoundedIcon fontSize="small" />
              Developer Guide
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Edit UI and templates using the built-in Overrides Editor. Includes file types, validation, and
              troubleshooting.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button component={Link} href="/docs/developer" variant="contained">
                Open Developer Docs
              </Button>
            </Box>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 3,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayCircleOutlineRoundedIcon fontSize="small" />
              User Guide
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Follow module-by-module tutorials with clear action steps for inventory, finance, operations, and more.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button component={Link} href="/docs/users" variant="contained">
                Open User Docs
              </Button>
            </Box>
          </Paper>
        </Stack>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={900}>
            Popular topics
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
            <Button component={Link} href="/docs/users#inventory" size="small" variant="outlined">
              Inventory tutorial
            </Button>
            <Button component={Link} href="/docs/users#procurement" size="small" variant="outlined">
              Procurement flow
            </Button>
            <Button component={Link} href="/docs/users#finance" size="small" variant="outlined">
              Finance review guide
            </Button>
            <Button component={Link} href="/docs/users#helpdesk" size="small" variant="outlined">
              Helpdesk handling
            </Button>
            <Button component={Link} href="/docs/developer" size="small" variant="outlined">
              Override file examples
            </Button>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={900}>
            Quick Start
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <Typography variant="body2" color="text.secondary">
                Begin with <strong>User Guide</strong> for operational workflows and daily actions.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Use <strong>Developer Guide</strong> when you need override/config customization.
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Share docs with team members for onboarding and process consistency.
              </Typography>
            </li>
          </ol>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={900} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LiveHelpRoundedIcon fontSize="small" />
            FAQ
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="body2" fontWeight={700}>
                I cannot see some modules. Why?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Module visibility depends on assigned access and role. Ask your owner/admin for access updates.
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={700}>
                Changes are not visible. What should I do?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Refresh first. If still missing, confirm with your team that the change was saved and applied.
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={700}>
                Where should new users begin?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start with User Guide tutorials, then use Developer Guide only for configuration or override changes.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Security note: the editor and any developer tools are role-protected. This documentation intentionally
            avoids sensitive implementation details.
          </Typography>
        </Paper>
      </Stack>
    </Container>
  );
}

