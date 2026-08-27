import { useState } from "react";
interface Props { hasPicked: boolean; onPlan: () => void; onAssistant: () => void; onSOS: () => void; onDatabase: () => void; }
export default function HeatMapFAB({ hasPicked, onPlan, onAssistant, onSOS, onDatabase }: Props) {
 const [open,setOpen]=useState(false); const actions=[['🌳','Plan',onPlan],['🤖','Assistant',onAssistant],['🆘','SOS',onSOS],['🗂️','Database',onDatabase]] as const;
 return <div className="absolute bottom-28 right-4 z-20 flex flex-col items-end gap-2">{open && actions.map(([icon,label,action])=><button key={label} onClick={()=>{setOpen(false);action();}} className="rounded-full bg-white px-3 py-2 text-xs font-semibold shadow-lg">{icon} {label}{label==='Plan'&&!hasPicked?' · select map point first':''}</button>)}<button aria-label="Open map actions" onClick={()=>setOpen(!open)} className="h-14 w-14 rounded-full bg-heat-600 text-2xl text-white shadow-xl">{open?'×':'+'}</button></div>;
}
