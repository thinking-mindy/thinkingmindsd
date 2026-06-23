import * as React from 'react';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import { useUser } from '@/lib/auth/client';
import { Alert, AlertTitle, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormLabel, Grid, IconButton, Menu, MenuItem, Select, Snackbar, TextField, Typography } from '@mui/material';
import { AttachFileOutlined, DeleteOutline, EditNote, HighlightOffOutlined, MoreHoriz, MoreVert, RotateLeftOutlined, TaskAltOutlined, WysiwygOutlined } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
// import { deleteTask, deleteTaskId, updateTask } from '@/app/actions/subjects';
// TODO: Update to use @/lib/desktop/projects-bridge
const deleteTaskId = async (id: any) => ({ aye: false });
const updateTask = async (task: any) => ({ success: false });
import dayjs, { Dayjs } from 'dayjs';
import Chipy from './Chipy';
import { DateTimePicker } from '@mui/x-date-pickers';
import { getMembers } from '@/lib/desktop/users-bridge';

export default function CustomizedDataGrid() {

  const renderChip=(e:any)=>{
    return(
      <Chipy s={e.value}/>
    )
  }
 
  const user=useUser()
  const [taskRows,setRows]=React.useState<GridRowsProp>([]);
  const [taskCol,setCol]=React.useState<GridColDef[]>([]);
  const [loading,setLoading]=React.useState<boolean>(true);
  const handleCloseS = () => {setOpenS(false);}
  const [openS, setOpenS] = React.useState<boolean>(false);
    const handleClose = () => {setDone(false);}

  
    const [done, setDone] = React.useState<boolean>(false);
    const [users, setUsers] = React.useState<any>([]);
    const [ctask, setCtask] = React.useState<any>({});
    const [err, setErr] = React.useState<string>('');
    const [img,setImg]=React.useState<any>(ctask.docs||[]);

   React.useEffect(()=>{
    //getAllTasks().then((d)=>{setRows(d.aye);setLoading(false)})
    getMembers().then((e)=>setUsers(e.aye))
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
   const [del,setDel]=React.useState<any>(false);
    const handleCloseDel = () => {setDel(false);}
  
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

    const onDeleteTask=(id:any)=>{
            deleteTaskId(id).then(d=>{setDel(d.aye);go.refresh()})
        }
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
          <MenuItem onClick={()=>{handleClose();go.push(`/tasks/view?id=${item.row.id}`)}}><WysiwygOutlined sx={{mr:1}}/>Task Details</MenuItem>
          <MenuItem onClick={()=>{handleClose();setCtask(item.row);setOpenS(true)}}><EditNote sx={{mr:1}}/>Update Task</MenuItem>
          <Divider/>
          <MenuItem sx={{color:'#f54251'}} onClick={()=>{handleClose();onDeleteTask(item.row.id)}}><DeleteOutline sx={{color:'#f54251'}} />Remove Task</MenuItem>
        </Menu>
        </>
    )
  }

  


    const handleUpdateTask=async()=>{
            handleCloseS()
            setDone(true);
            const tmpt=ctask.activity;tmpt.push({user:user?.user?.fullName,date:dayjs().toString(),action:"Task was edited"});
            setCtask({...ctask,activity:tmpt})
            updateTask(ctask).then(x=>console.log("Task updated"));
        }

        
          const [limErr, setLimErr]=React.useState<boolean>(false);
        
          const onChange = (file:any) => {
            if(img.length<4){
              const reader = new FileReader()
              const { files } = file.target
              if (files && files.length !== 0) {
                reader.onload = () =>{let tmp=ctask.docs;tmp.push(reader.result);setCtask({...ctask,docs:tmp})}
                reader.readAsDataURL(files[0])
              }
            }else{setLimErr(true)}
          }

  return (
    <>
    <Snackbar
            anchorOrigin={{ vertical:'top', horizontal:'center' }}
            open={done}
            autoHideDuration={3000}
            onClose={handleClose}
          >
            <Alert
              onClose={handleClose}
              color='success'
              severity="success"
              variant="filled"
              sx={{ width: '100%' }}
            >
              Task successfuly updated.
            </Alert>
          </Snackbar>
          <Snackbar
                    anchorOrigin={{ vertical:'top', horizontal:'center' }}
                    open={del}
                    autoHideDuration={3000}
                    onClose={handleCloseDel}
                  >
                    <Alert
                      onClose={handleCloseDel}
                      color='error'
                      severity="error"
                      variant="filled"
                      sx={{ width: '100%' }}
                    >
                      Task successfuly deleted.
                    </Alert>
                  </Snackbar>
    <DataGrid
      checkboxSelection
      rows={taskRows}
      rowHeight={90}
      slots={{
        noRowsOverlay:()=><Container maxWidth='xs' sx={{mt:10}}><Typography sx={{ color: 'text.primary' }}>No tasks available.</Typography></Container>
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
    <Dialog
            open={openS}
            sx={{ backdropFilter: "blur(1px)" }}
            onClose={handleCloseS}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle textAlign='center' id="alert-dialog-title" sx={{ fontWeight: 660}}>
              Update a task
            </DialogTitle>
            <Divider/>
            <DialogContent>
              <Box
                component="form"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: { sm: '100%', md: '450px' },
                  gap: 2,
                }}
              >
                <FormControl>
                  <FormLabel sx={{fontWeight:'bold'}} htmlFor="email">Task title</FormLabel>
                  <TextField type="text" placeholder="Task Name" required variant="filled" value={ctask.title} onChange={(event)=>setCtask({...ctask,title:event.target.value})}/>
                </FormControl>
    
                <FormControl variant="filled">
                  <FormLabel sx={{fontWeight:'bold'}} htmlFor="email">Select Department</FormLabel>
                  <Select defaultValue="IT and Marketing" value={ctask.dep} onChange={(event)=>setCtask({...ctask,dep:event.target.value})}>
                    <MenuItem value="IT and Marketing">IT and Marketing</MenuItem>
                    <MenuItem value="Finance">Finance</MenuItem>
                    <MenuItem value="Teaching and Laearning">Teaching and Learning</MenuItem>
                    <MenuItem value="Gowero Campus">Gowero Campus</MenuItem>
                    <MenuItem value="Gweru Campus">Gweru Campus</MenuItem>
                    <MenuItem value="Bulawayo Campus">Bulawayo Campus</MenuItem>
                    <MenuItem value="Botswana Campus">Botswana Campus</MenuItem>
                    </Select>
                </FormControl>
    
                <FormControl>
                  <FormLabel sx={{fontWeight:'bold'}} htmlFor="email">Assigned by</FormLabel>
                  <Select value={ctask.assigner} onChange={(event)=>setCtask({...ctask,assigner:event.target.value})}>
                    {users.map((c:any)=><MenuItem value={c.first_name+' '+c.last_name}>{c.first_name+' '+c.last_name}</MenuItem>)}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel sx={{fontWeight:'bold'}} htmlFor="email">Assigned to</FormLabel>
                  <Select value={ctask.assignee} onChange={(event)=>setCtask({...ctask,assignee:event.target.value})}>
                    {users.map((c:any)=><MenuItem value={c.first_name+' '+c.last_name}>{c.first_name+' '+c.last_name}</MenuItem>)}
                  </Select>
                </FormControl>
    
                <FormControl>
                  <FormLabel sx={{fontWeight:'bold'}} htmlFor="email">Due Date</FormLabel>
                  <DateTimePicker defaultValue={dayjs('2025-05-17T08:00')} value={dayjs(ctask.due_date)} onChange={(event)=>setCtask({...ctask,due_date:event})}/>
                </FormControl>
    
                <FormControl variant="filled">
                  <FormLabel sx={{fontWeight:'bold'}} htmlFor="email">Status</FormLabel>
                  <Select defaultValue="todo" value={ctask.status} onChange={(event)=>setCtask({...ctask,status:event.target.value})}>
                    <MenuItem value="todo">To-Do</MenuItem>
                    <MenuItem value="in-progress">In-Progress</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="done">Done</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
                <FormControl variant="filled">
              <FormLabel sx={{fontWeight:'bold'}} htmlFor="email">Attached documents</FormLabel>
              <Grid container sx={{ display: 'flex', alignItems: 'center'}} spacing={2}>
                <Grid size={12}>
                {ctask.docs&&ctask.docs.map((x:any)=>(
                <object data={x} type="application/pdf" width="100%" height="100%">
                  <p>Unable to display as PDF file. <a href={x}>Download</a> instead.</p>
                </object>
              ))}
              </Grid>

            <Grid size={12}>
              <Button component='label' variant='outlined' startIcon={<AttachFileOutlined/>} htmlFor='account-settings-upload-image'>
                Add document
                <input
                  hidden
                  type='file'
                  onChange={onChange}
                  accept='.pdf, .doc, .docx, .ppt, .pptx , .xls, .xlsx'
                  multiple
                  id='account-settings-upload-image'
                />
              </Button>
              <Button color='error' variant='contained' onClick={() =>{setImg([]);setLimErr(false)}} sx={{ml:2}} startIcon={<RotateLeftOutlined/>}>
                Reset
              </Button>
              <Typography variant='body2' sx={{ marginTop: 5 }}>
                Allowed Pdf , Doc and Docx. Max size of 5MB. Max number of 4.
              </Typography>
              {limErr&&<Typography variant='body2' color="error" sx={{ marginTop: 5 }}>Max number of 4 reached</Typography>}
            </Grid>
            </Grid>
            </FormControl>
                {err&&<Alert severity='error'><AlertTitle>Error</AlertTitle>{err}</Alert>}
              </Box>
              
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" startIcon={<HighlightOffOutlined/>} onClick={handleCloseS}>Cancel</Button>
              <Button variant="contained" endIcon={<TaskAltOutlined/>} onClick={()=>handleUpdateTask()}>Update task</Button>
            </DialogActions>
          </Dialog>
    </>
  );
}
