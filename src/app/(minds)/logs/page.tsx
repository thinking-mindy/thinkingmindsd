'use client'
import * as React from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import StatCard, { StatCardProps } from '@/components/StatCard';
import { ArrowRightAltOutlined, LightbulbOutlined, LightModeOutlined } from '@mui/icons-material';
import { Avatar, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, Link, Skeleton,styled } from '@mui/material';
import SideMenu from '@/components/SideMenu';

export default function AdminDash() {
  const [openS, setOpenS] = React.useState<boolean>(true);
  const handleCloseS = () => { setOpenS(false); }
  const [stats,setStats]=React.useState<any>([])

  // Removed taskStats import - function doesn't exist
   const CardWrapperSecondary=styled(Card)(
    ({ theme }) => `
        background:${theme.palette.success.main};
        color: ${theme.palette.primary.contrastText};
        border-top-left-radius: 6;
        max-width: 430px;
        text-align: start;
        font-weight:500;
  `
  );
  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <Dialog
        open={openS}
        sx={{ backdropFilter: "blur(5px)" }}
        onClose={handleCloseS}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle textAlign='center' id="alert-dialog-title">
          Welcome to The School!
        </DialogTitle>
        <DialogContent>
          <Divider/>
          <DialogContentText textAlign='center' variant="body2" id="alert-dialog-description">

            <Box display="flex" alignItems="flex-start" justifyContent="flex-start" py={1}>
              <Avatar variant="rounded" sx={{ width: 50, height: 50,borderRadius:9 }} alt="Veela" src="/images/v/veela.jpg" />
              <Box display="flex" alignItems="flex-start" flexDirection="column" justifyContent="flex-start" ml={0} gap={2}>
                <CardWrapperSecondary>
                  Hey, i'm Veela!, welcome to Thinking Mind's school.
                </CardWrapperSecondary>
                <CardWrapperSecondary>
                  Please note this a demo app and the data is fake and only meant for demostration purposes.
                </CardWrapperSecondary>
                
              </Box>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" endIcon={<ArrowRightAltOutlined/>} onClick={handleCloseS}>Continue with demo</Button>
        </DialogActions>
      </Dialog>
      <Typography component="h2" variant="h3" sx={{ my: 5}}>
        <Box display='flex' flexDirection='row'>Welcome, <Skeleton width={150} sx={{mx:1}}></Skeleton>!<LightModeOutlined color='warning'/></Box>
      </Typography>
      
    </Box>
  );
}
