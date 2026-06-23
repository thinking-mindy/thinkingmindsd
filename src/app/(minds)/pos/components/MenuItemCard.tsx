import React from "react";
import { Typography, Box, IconButton, alpha, styled, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import { MenuItem } from "../types";
import Image from "next/image";

const Row = styled(Box, { shouldForwardProp: (p) => p !== "$outOfStock" && p !== "$fullWidth" })<{ $outOfStock?: boolean; $fullWidth?: boolean }>(
  ({ theme, $outOfStock, $fullWidth }) => ({
    display: "inline-flex",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1.25),
    padding: theme.spacing(0.9, 1.25),
    borderRadius: 8,
    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    backgroundColor: theme.palette.background.paper,
    cursor: $outOfStock ? "not-allowed" : "pointer",
    transition: "all 0.2s ease",
    minHeight: 52,
    width: $fullWidth ? "100%" : "fit-content",
    maxWidth: "100%",
    ...($outOfStock
      ? {
          "&:hover, &:focus-visible": {
            borderColor: theme.palette.error.main,
            backgroundColor: alpha(theme.palette.error.main, 0.06),
            outline: "none",
          },
        }
      : {
          "&:hover": {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            "& .add-btn": {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            },
          },
        }),
  })
);

const Thumb = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 6,
  overflow: "hidden",
  flexShrink: 0,
  backgroundColor: alpha(theme.palette.divider, 0.2),
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

export default function MenuItemCard({
  item,
  onAdd,
  inCartQty = 0,
  fullWidth = false,
}: {
  item: MenuItem;
  onAdd?: () => void;
  inCartQty?: number;
  fullWidth?: boolean;
}) {
  const serial = item.sku ?? "—";
  const stock = item.quantity ?? 0;
  const remaining = Math.max(0, stock - inCartQty);

  const handleCardClick = () => {
    if (remaining > 0) onAdd?.();
  };

  const outOfStock = remaining <= 0;

  return (
    <Row
      $outOfStock={outOfStock}
      $fullWidth={fullWidth}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(); } }}
    >
      <Thumb>
        <Image
          src={item.img || "/logo.png"}
          alt={item.name}
          width={40}
          height={40}
          style={{ objectFit: "cover" }}
        />
      </Thumb>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4, minWidth: 0, flex: "1 1 auto" }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: "0.8rem",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: "0.68rem",
            fontFamily: "monospace",
          }}
        >
          {serial}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "primary.main",
              fontSize: "0.8rem",
            }}
          >
            ${item.price.toFixed(2)}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Typography
              variant="caption"
              sx={{
                color: outOfStock ? "error.main" : "text.secondary",
                fontWeight: outOfStock ? 600 : 400,
                fontSize: "0.68rem",
              }}
            >
              {remaining} left
            </Typography>
            {inCartQty > 0 && (
              <Chip
                size="small"
                variant="outlined"
                color="primary"
                icon={<ShoppingCartOutlined sx={{ fontSize: 14 }} />}
                label={inCartQty}
                sx={{
                  height: 22,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
                }}
              />
            )}
          </Box>
        </Box>
      </Box>
      <IconButton
        className="add-btn"
        size="small"
        onClick={(e) => { e.stopPropagation(); onAdd?.(); }}
        disabled={remaining <= 0}
        sx={{
          flexShrink: 0,
          width: 30,
          height: 30,
          backgroundColor: alpha("#000", 0.06),
          "&:hover": {
            backgroundColor: "primary.main",
            color: "primary.contrastText",
          },
        }}
      >
        <AddIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Row>
  );
}
