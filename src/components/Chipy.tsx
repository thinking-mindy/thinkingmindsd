import { LightbulbOutline } from "@mui/icons-material"
import { Chip } from "@mui/material"

const Chipy=({s}:{s:string})=>{
    return(
        <Chip icon={<LightbulbOutline/>} size='small' color={(s==="done"||s==="completed")?'success':(s==="in-progress"?'info':(s==="cancelled"?'error':(s==="todo"?'warning':'default')))} label={s}
        />
    )
}
export default Chipy