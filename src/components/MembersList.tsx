import * as React from 'react';
import { DataGrid, GridRowsProp } from '@mui/x-data-grid';
import { Avatar, Chip, Divider, IconButton, ListItem, ListItemAvatar, ListItemText, Menu, MenuItem } from '@mui/material';
import { DeleteOutline, EditNote, MoreVert, WysiwygOutlined } from '@mui/icons-material';
import { useUser } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { getMembers } from '@/lib/desktop/users-bridge';
import dayjs from 'dayjs';

export default function MemberList() {
  const go=useRouter();
  const user= useUser()

  const [rows,setRows]=React.useState<GridRowsProp>([]);
  const [columns,setColumns]=React.useState<any>([]);

  React.useEffect(()=>{
    getMembers().then(x=>setRows(x.aye));
    setColumns([
      { field: 'name', headerName: 'Full Name', flex: 1.5, minWidth: 150,renderCell:(e:any)=>renderUser(e)},
      { field: 'public_metadata.dep', headerName: 'Department', flex: 1.5, minWidth: 200,renderCell:(e:any)=>e.row.public_metadata.dep},
      { field: 'due_date', headerName: 'Joined on', flex: 2, minWidth: 200,renderCell:(e:any)=>dayjs(e.row.created_at).format('dddd, MMMM D, YYYY h:mm A')},
      { field: 'role', headerName: 'Role', flex: 1, minWidth: 200,renderCell:(e:any)=><Chip label={e.row.public_metadata.role}/>},
      user.user?.publicMetadata?.role==='admin'?{field: '',headerName: 'Manage',minWidth: 15,renderCell: (e:any)=>renderIcon(e)}:{}
    ])
  },[])

  function renderUser(e:any){
    return (
      <ListItem>
          <ListItemAvatar>
            <Avatar alt={e.row.first_name} src={e.row.image_url}/>
          </ListItemAvatar>
          <ListItemText primary={`${e.row.first_name} ${e.row.last_name}`} secondary={e.row.email_addresses[0].email_address} />
        </ListItem>
    );
  }
  const renderIcon=(item:any)=>{
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
      <IconButton onClick={handleClick}><MoreVert/></IconButton>
      <Menu
          id="basic-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <MenuItem href='' onClick={()=>{handleClose();go.push(`/tasks/view?id=${item.row.id}`)}}><WysiwygOutlined sx={{mr:1}}/>View Details</MenuItem>
          <MenuItem onClick={handleClose}><EditNote sx={{mr:1}}/>Make admin</MenuItem>
          <Divider/>
          <MenuItem onClick={handleClose}><DeleteOutline sx={{mr:1}}/>Remove</MenuItem>
        </Menu>
        </>
    )
  }
  
  return (
    <DataGrid
      checkboxSelection
      rows={rows}
      showToolbar
      loading={rows?.length?false:true}
      rowHeight={90}
      columns={columns}
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
