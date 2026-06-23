import * as React from 'react';

interface EmailTemplateProps {
  firstName: string,
  task: any,
  assigner: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>>=({firstName,assigner,task})=>(
  <div>
    <p>Hello, {firstName}!</p>
    <p>You have been assigned a task by {assigner}</p>
    <p><b>Task Details:</b></p>
    <tr><td><b>Task Title:</b></td><td>{task.title}</td></tr>
    <tr><td><b>Created On:</b></td><td>{task.date}</td></tr>
    <tr><td><b>Due Date:</b></td><td>{task.due_date}</td></tr>
                                
    <p><b>File Attachements:</b></p><br/>
    {task.docs.length&&task.docs.map((x:any)=><p><a href={x}>Download File</a></p>)}

    <a href={`https://pagraft.vercel.app/tasks/view?id=${task.id}`}><button>View Task</button></a>
  </div>
);