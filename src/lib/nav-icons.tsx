"use client";

import type { ReactNode } from "react";
import {
  AttachMoneyOutlined,
  BarChartOutlined,
  ComputerOutlined,
  CurrencyExchangeOutlined,
  Groups2Outlined,
  HelpOutlineOutlined,
  HomeOutlined,
  Inventory2Outlined,
  ListAltOutlined,
  PaidOutlined,
  Payment as PaymentIcon,
  PeopleAltOutlined,
  PointOfSaleOutlined,
  SchoolOutlined,
  SettingsOutlined,
  ShoppingCartOutlined,
  TaskOutlined,
} from "@mui/icons-material";

/** Map menu path → icon (used when building sidebar sections). */
export const NAV_ICON_MAP: Record<string, ReactNode> = {
  "/": <HomeOutlined />,
  "/dashboard": <HomeOutlined />,
  "/pos": <PointOfSaleOutlined />,
  "/cashier": <PaymentIcon />,
  "/finance": <AttachMoneyOutlined />,
  "/currency": <CurrencyExchangeOutlined />,
  "/audit": <ListAltOutlined />,
  "/inventory": <Inventory2Outlined />,
  "/procurement": <ShoppingCartOutlined />,
  "/hr": <Groups2Outlined />,
  "/school": <SchoolOutlined />,
  "/tasks": <TaskOutlined />,
  "/crm": <PeopleAltOutlined />,
  "/it": <ComputerOutlined />,
  "/helpdesk": <HelpOutlineOutlined />,
  "/admin": <SettingsOutlined />,
  "/admin?tab=plan": <PaidOutlined />,
  "/reports": <BarChartOutlined />,
};
