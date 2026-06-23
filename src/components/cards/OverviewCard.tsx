import PropTypes from 'prop-types';

// @mui
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// @project
import MainCard from '@/components/MainCard';

/***************************   CARD - OVERVIEW   ***************************/

interface OverviewCardProps {
  title?: string;
  value?: string;
  chip?: any;
  compare?: string;
  cardProps?: any;
}

export default function OverviewCard({ title, value, chip, compare, cardProps }: OverviewCardProps) {
  const chipDefaultProps = { color: 'success', variant: 'text', size: 'small' };

  return (
    <MainCard {...cardProps}>
      <Stack sx={{ gap: { xs: 1, md: 1 } }}>
        <Typography variant="subtitle1">{title}</Typography>
        <Stack sx={{ gap: 0.5 }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <Typography variant="h4">{value}</Typography>
            <Chip {...{ ...chipDefaultProps, ...chip }} />
          </Stack>
          <Typography variant="caption" color="grey.700">
            {compare}
          </Typography>
        </Stack>
      </Stack>
    </MainCard>
  );
}

OverviewCard.propTypes = {
  title: PropTypes.string,
  value: PropTypes.string,
  chip: PropTypes.any,
  compare: PropTypes.string,
  cardProps: PropTypes.any
};
