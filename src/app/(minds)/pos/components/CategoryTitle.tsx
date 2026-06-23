import React from "react";
import { Paper, Typography, Box, Chip, alpha, styled } from "@mui/material";
import { MenuCategory } from "../types";

const CategoryCard = styled(Paper)<{ selected?: boolean }>(({ theme, selected }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: theme.spacing(2.5),
  cursor: "pointer",
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  borderRadius: 16,
  background: selected
    ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
    : theme.palette.background.paper,
  color: selected ? theme.palette.primary.contrastText : theme.palette.text.primary,
  border: `1px solid ${selected ? 'transparent' : alpha(theme.palette.divider, 0.5)}`,
  boxShadow: selected
    ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`
    : `0 2px 8px ${alpha(theme.palette.common.black, 0.08)}`,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: selected
      ? `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`
      : `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
    borderColor: selected ? 'transparent' : theme.palette.primary.main,
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5),
    borderRadius: 12,
  },
}));

export default function CategoryTile({
  category,
  selected,
  onClick,
  i
}: {
  category: MenuCategory;
  selected?: boolean;
  i: number;
  onClick?: () => void;
}) {
  return (
    <CategoryCard selected={selected} onClick={onClick} elevation={0}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          mb: 1,
          color: selected ? 'inherit' : 'text.primary',
          fontSize: { xs: '0.875rem', sm: '1rem' },
        }}
      >
        {category.title}
      </Typography>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: { xs: 0.5, sm: 1 } }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: selected ? 'inherit' : 'primary.main',
            fontSize: { xs: '1.5rem', sm: '2.125rem' },
          }}
        >
          {category.itemsCount || 0}
        </Typography>
        <Chip
          label="items"
          size="small"
          sx={{
            backgroundColor: selected
              ? alpha('#ffffff', 0.2)
              : alpha('#ffffff', 0.1),
            color: selected ? 'inherit' : 'text.secondary',
            fontWeight: 500,
            fontSize: { xs: '0.65rem', sm: '0.75rem' },
            height: { xs: 20, sm: 24 },
          }}
        />
      </Box>
    </CategoryCard>
  );
}