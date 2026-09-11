import {sync,jobStatus} from './sync.mjs';
import {connect} from './auth.mjs';
import {acquireLock,setting} from './storage.mjs';
const [command='status',json='{}']=process.argv.slice(2);
try{
  let result;
  if(command==='sync')result=await sync(JSON.parse(json));
  else if(command==='connect'){const release=acquireLock();try{result=await connect();}finally{release();}}
  else if(command==='job')result=jobStatus(json);
  else if(command==='status')result={connection:setting('connection'),last_sync:setting('last_sync')};
  else throw Error('UNKNOWN_COMMAND');
  console.log(JSON.stringify(result));
  if(result?.status==='failed')process.exitCode=1;
}catch(e){console.log(JSON.stringify({status:'failed',error:/^[A-Z_0-9]+$/.test(e.message)?e.message:'OPERATION_FAILED'}));process.exitCode=1;}
