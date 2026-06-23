import * as React from 'react';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import { Container, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import { DeleteOutline, EditNote, MoreHoriz, MoreVert, WysiwygOutlined } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
// import { getAllSubs } from '@/app/actions/subjects';
// TODO: Update to use @/lib/desktop/projects-bridge
const getAllSubs = async () => ({ aye: [] });
import dayjs from 'dayjs';
import Chipy from './Chipy';

export default function CustomizedDataGrid() {

  const renderChip=(e:any)=>{
    return(
      <Chipy s={e.value}/>
    )
  }

  const [taskRows,setRows]=React.useState<GridRowsProp>();
  const [taskCol,setCol]=React.useState<GridColDef[]>([]);
  const [loading,setLoading]=React.useState<boolean>(true);

  React.useEffect(()=>{
    getAllSubs().then((d)=>{setRows(d.aye.length>5?d.aye.slice(5):d.aye);setLoading(false)})
    setCol([
      { field: 'date', headerName: 'Date', flex: 1, minWidth:80,renderCell:(e)=>dayjs(e.value).format('DD-MM-YYYY')},
      { field: 'title', headerName: 'Task Name', flex: 1.5, minWidth: 200},
      { field: 'dep', headerName: 'Department', flex: 1, minWidth: 150 },
      { field: 'assignee', headerName: 'Assigned To', flex: 1, minWidth: 150 },
      { field: 'assigner', headerName: 'Assigned By', flex: 1, minWidth: 150 },
      { field: 'due_date', headerName: 'Due Date', flex: 1.5, minWidth: 250 },
      { field: 'status', headerName: 'Status',flex: 1,minWidth: 100,renderCell:(e:any)=>renderChip(e)},
      {field: '',headerName: 'Options',minWidth: 10,renderCell: (e:any)=>renderIcon(e)},
      ])
   },[])
  
  const renderIcon=(item:any)=>{
    const go=useRouter()
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
      setAnchorEl(null);
    };
  
    return (
      <>
      <IconButton onClick={handleClick}><MoreHoriz/></IconButton>
      <Menu
          id="basic-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <MenuItem onClick={()=>{handleClose();go.push(`/tasks/view?id=${item.row.id}`)}}><WysiwygOutlined sx={{mr:1}}/>View Details</MenuItem>
          <Divider/>
        </Menu>
        </>
    )
  }
  
  return (
    <DataGrid
      checkboxSelection
      rows={taskRows}
      rowHeight={90}
      showToolbar
      slots={{
              noRowsOverlay:()=><Container maxWidth='xs' sx={{mt:10}}><Typography sx={{ color: 'text.primary' }}>No tasks available.</Typography></Container>
            }}
      loading={loading}
      columns={taskCol}
      getRowClassName={(params) =>
        params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
      }
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
