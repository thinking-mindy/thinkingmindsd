import * as React from "react";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import PointOfSaleOutlined from "@mui/icons-material/PointOfSaleOutlined";
import AttachMoneyOutlined from "@mui/icons-material/AttachMoneyOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import Groups2Outlined from "@mui/icons-material/Groups2Outlined";
import TaskOutlined from "@mui/icons-material/TaskOutlined";
import PeopleAltOutlined from "@mui/icons-material/PeopleAltOutlined";
import ComputerOutlined from "@mui/icons-material/ComputerOutlined";
import HelpOutlineOutlined from "@mui/icons-material/HelpOutlineOutlined";
import CurrencyExchangeOutlined from "@mui/icons-material/CurrencyExchangeOutlined";
import ListAltOutlined from "@mui/icons-material/ListAltOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import PaymentOutlined from "@mui/icons-material/PaymentOutlined";
import BarChartOutlined from "@mui/icons-material/BarChartOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";

/** @mui SvgIcon component for each sidebar / menubar route. */
export const MIND_MENU_PATH_ICON: Record<string, React.ElementType<SvgIconProps>> = {
  "/": HomeOutlined,
  "/pos": PointOfSaleOutlined,
  "/cashier": PaymentOutlined,
  "/finance": AttachMoneyOutlined,
  "/inventory": Inventory2Outlined,
  "/procurement": ShoppingCartOutlined,
  "/hr": Groups2Outlined,
  "/school": SchoolOutlined,
  "/tasks": TaskOutlined,
  "/crm": PeopleAltOutlined,
  "/it": ComputerOutlined,
  "/helpdesk": HelpOutlineOutlined,
  "/currency": CurrencyExchangeOutlined,
  "/audit": ListAltOutlined,
  "/admin": SettingsOutlined,
  "/admin?tab=plan": PaymentOutlined,
  "/reports": BarChartOutlined,
};

export function MindMenuPathIcon({
  path,
  ...props
}: SvgIconProps & { path: string }) {
  const Cmp = MIND_MENU_PATH_ICON[path] ?? HomeOutlined;
  return <Cmp {...props} />;
}
