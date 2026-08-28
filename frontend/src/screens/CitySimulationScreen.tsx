import { ArrowLeft } from "lucide-react";

import {useEffect,useState} from 'react'; import {getCitySimulation3D,type CitySimulation3D} from '../api';
export default function CitySimulationScreen({lat,lng,locationName,onBack}:{lat:number;lng:number;locationName:string;onBack:()=>void}){const [data,setData]=useState<CitySimulation3D|null>(null);useEffect(()=>{getCitySimulation3D(lat,lng).then(setData).catch(()=>setData(null))},[lat,lng]);return <section className="h-full overflow-y-auto p-5"><button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-heat-600">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />Planner
    </button><h1 className="mt-4 text-xl font-bold">City simulation: {locationName}</h1>{!data?<p className="mt-4">Loading simulation…</p>:<div className="mt-4 text-sm"><p>{data.stats.building_count} simulated buildings · max {data.stats.max_temp}°F</p><p className="mt-2">Suggested interventions: {data.interventions.length}</p></div>}</section>}
