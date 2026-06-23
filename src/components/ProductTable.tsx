"use client";

import { getAllInventoryItems } from "@/lib/desktop/inventory-bridge";
import {
  Container,
  Typography
} from "@mui/material";
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import React from "react";

export default function ProductTable() {
  const [taskRows, setRows] = React.useState<GridRowsProp>([]);
    const [taskCol, setCol] = React.useState<GridColDef[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    
    React.useEffect(() => {
        getAllInventoryItems().then((d)=>{setRows(d.success ? (d.data || []) : []);setLoading(false)})
        setCol([
          { field: 'date', headerName: 'Date', flex: 1.5, minWidth: 200 },
          { field: 'name', headerName: 'Name', flex: 1.5, minWidth: 200 },
          { field: 'sku', headerName: 'SKU', flex: 1, minWidth: 150 },
          { field: 'category', headerName: 'Category', flex: 1, minWidth: 150 },
          { field: 'stock', headerName: 'Remaining', flex: 1, minWidth: 150 },
        ])
      }, [])

  return (
    <DataGrid
            checkboxSelection
            rows={taskRows}
            rowHeight={90}
            slots={{
              noRowsOverlay: () => <Container maxWidth='xs' sx={{ mt: 10 }}><Typography sx={{ color: 'text.primary' }}>No tasks available.</Typography></Container>
            }}
            loading={loading}
            showToolbar
            columns={taskCol}
            getRowClassName={(params) =>
              params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
            }
            showCellVerticalBorder
            showColumnVerticalBorder
            initialState={{
              pagination: { paginationModel: { pageSize: 20 } },
            }}
            pageSizeOptions={[10, 20, 50]}
            disableColumnResize
            density="compact"
            slotProps={{
              filterPanel: {
                filterFormProps: {
                  logicOperatorInputProps: {
                    variant: 'outlined',
                    size: 'small',
                  },
                  columnInputProps: {
                    variant: 'outlined',
                    size: 'small',
                    sx: { mt: 'auto' },
                  },
                  operatorInputProps: {
                    variant: 'outlined',
                    size: 'small',
                    sx: { mt: 'auto' },
                  },
                  valueInputProps: {
                    InputComponentProps: {
                      variant: 'outlined',
                      size: 'small',
                    },
                  },
                },
              },
            }}
          />
  );
}
