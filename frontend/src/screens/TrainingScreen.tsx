import { ArrowLeft } from "lucide-react";

import {useState} from 'react'; import {trainModel,type TrainingResult} from '../api';
export default function TrainingScreen({onBack}:{onBack:()=>void}){const [r,setR]=useState<TrainingResult|null>(null);const [busy,setBusy]=useState(false);async function run(){setBusy(true);try{setR(await trainModel())}finally{setBusy(false)}}return <section className="h-full overflow-y-auto p-5"><button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-heat-600">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />Settings
    </button><h1 className="mt-4 text-xl font-bold">Pattern trainer</h1><p className="mt-2 text-sm">Runs HITR’s local heuristic training cycle; this is not a remote AI model.</p><button onClick={run} disabled={busy} className="mt-4 rounded bg-heat-600 px-4 py-2 text-white">{busy?'Training…':'Run training'}</button>{r&&<p className="mt-3 text-sm">{r.status} · accuracy {Math.round(r.accuracy*100)}%</p>}</section>}
