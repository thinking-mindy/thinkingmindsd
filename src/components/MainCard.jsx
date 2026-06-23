'use client';
import PropTypes from 'prop-types';

// @mui
import Card from '@mui/material/Card';

/***************************  MAIN CARD  ***************************/

export default function MainCard({ children, sx = {}, ref, ...others }) {
  const defaultSx = (theme) => ({
    p: { xs: 1.75, sm: 2.25, md: 3 },
    '&:hover': { transform: 'scale(1.05)', transition: 'all 0.3s ease-in-out' }
  });

  return (
    <Card ref={ref} sx={defaultSx} {...others}>
      {children}
    </Card>
  );
}

MainCard.propTypes = { children: PropTypes.any, sx: PropTypes.object, ref: PropTypes.any, others: PropTypes.any };
