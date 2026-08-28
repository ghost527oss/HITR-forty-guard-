import { ArrowLeft } from "lucide-react";

export default function EmergencyScreen({onBack}:{onBack:()=>void}){return <section className="h-full overflow-y-auto bg-red-50 p-5"><button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-red-900">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back
    </button><h1 className="mt-4 text-2xl font-bold text-red-900">Heat emergency</h1><p className="mt-3 rounded-xl bg-white p-4 text-sm">For California, USA only. Emergency numbers shown are US-specific. If a person is confused, unconscious, seizing, or has signs of heat stroke, call <a className="font-bold underline" href="tel:911">911</a> immediately. Move them to a cooler place and begin rapid cooling while waiting for emergency services.</p></section>}
