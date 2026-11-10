'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  FileText,
  Globe,
  Home,
  MapPin,
  Megaphone,
  Mountain,
  PhoneCall,
  Radio,
  Route,
  Send,
  Shield,
  Signpost,
  Users,
  Zap,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import AlertReviewModal, { AlertDraftData } from './AlertReviewModal';
import AlertSectionBanner from './AlertSectionBanner';
import { publicApi } from '@/lib/api';
import { PublicRoadStatusItem } from '@/types/public';

const NORTHEAST_STATES = [
  'Nagaland',
  'Assam',
  'Sikkim',
  'Meghalaya',
  'Arunachal Pradesh',
  'Manipur',
  'Mizoram',
  'Tripura',
];

const KNOWN_VILLAGES: Record<string, string[]> = {
  Nagaland: ['Phesama (Kohima)', 'Dzüdza (Kohima)', 'Medziphema (Chümoukedima)', 'Kiphire Town'],
  Assam: ['Jatinga (Dima Hasao)', 'Harangajao (Dima Hasao)', 'Sonapur Outskirts (Kamrup)', 'Umrangso'],
  Sikkim: ['Melli Bazaar (South Sikkim)', 'Singtam (East Sikkim)', 'Rangpo (Pakyong)', 'Chungthang (North Sikkim)'],
  Meghalaya: ['Cherrapunji / Sohra (East Khasi Hills)', 'Sonapur Portal (East Jaintia Hills)', 'Mawlynnong', 'Nongpoh (Ri-Bhoi)'],
  'Arunachal Pradesh': ['Khonsa (Tirap)', 'Bhalukpong (West Kameng)', 'Pasighat Outskirts', 'Tawang Valley'],
  Manipur: ['Noney (Tamenglong)', 'Maram (Senapati)', 'Awangkhul (Noney)', 'Tupul Valley'],
  Mizoram: ['Vairengte (Kolasib)', 'Hmuifang (Aizawl)', 'Sairang Valley', 'Champhai Border'],
  Tripura: ['Dharmanagar (North Tripura)', 'Baramura Foothills', 'Jampui Hills', 'Ambassa'],
};

interface EmergencyTemplate {
  name: string;
  severity: 'Critical' | 'Warning' | 'Watch';
  title: string;
  description: string;
  advisory: string;
  targetType: 'corridor' | 'village';
  suggestedState: string;
  landmark?: string;
}

const TEMPLATES: EmergencyTemplate[] = [
  {
    name: 'NH-29 Dzüdza Severe Mudflow (Critical)',
    severity: 'Critical',
    title: 'Severe Slope Failure & Mudflow on NH-29 (Dzüdza Bridge)',
    description:
      'Continuous torrential rainfall exceeding 165mm in 24 hours has triggered a catastrophic 60m slope movement. Heavy debris and liquefied mud have severed all lanes.',
    advisory:
      'All vehicular movement prohibited. Evacuate roadside stalls immediately. Traffic diverted via Peducha-Tsiesema bypass. BRO heavy earthmovers mobilizing.',
    targetType: 'corridor',
    suggestedState: 'Nagaland',
    landmark: 'KM 44, Dzüdza River Stretch',
  },
  {
    name: 'Teesta Gorge Rockfall & Road Block (Critical)',
    severity: 'Critical',
    title: 'Active Rockfall & Highway Breach at 29th Mile (NH-10)',
    description:
      'High-velocity rock shooting and road subgrade subsidence detected near Teesta Bazar. River water level rising at road foundation toe.',
    advisory:
      'Highway strictly closed between Sevoke and Rangpo. Commuters must divert via Lava-Algarah. Responders deploy emergency flares.',
    targetType: 'corridor',
    suggestedState: 'Sikkim',
    landmark: '29th Mile, Teesta Bazar Stretch',
  },
  {
    name: 'Sonapur Tunnel Silt & Runoff Advisory (Warning)',
    severity: 'Warning',
    title: 'Heavy Silt Accumulation at Sonapur Tunnel Portal (NH-6)',
    description:
      'Intense hillside runoff carrying silt and gravel deposits across the southern tunnel approach. Reduced braking friction and single-lane bottleneck.',
    advisory:
      'Exercise extreme caution. Heavy trucks restricted to regulated single-lane convoy under Meghalaya Police traffic escort.',
    targetType: 'corridor',
    suggestedState: 'Meghalaya',
    landmark: 'Southern Portal, Sonapur Tunnel',
  },
  {
    name: 'Phesama Valley Geotechnical Saturation (Watch)',
    severity: 'Watch',
    title: 'Geotechnical Soil Moisture Alert for Phesama Valley Slopes',
    description:
      'Precipitation sensors indicate soil saturation exceeding 85% with continuous moderate drizzle. Micro-cracks detected on agricultural terrace berms.',
    advisory:
      'Village disaster coordinators advised to monitor uphill tension cracks. Villagers should prepare emergency bags and verify community shelter routes.',
    targetType: 'village',
    suggestedState: 'Nagaland',
    landmark: 'Upper Terrace Sector, Phesama',
  },
];

const TITLE_MAX = 120;
const BODY_MAX = 500;

function CustomCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="inline-flex items-center gap-2.5 text-xs font-semibold text-[#173D32] cursor-pointer select-none text-left group"
    >
      <span
        className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
          checked
            ? 'bg-[#173D32] border-[#173D32] text-[#F6F4EC] shadow-2xs'
            : 'bg-white border-[#173D32]/30 group-hover:border-[#173D32]/60'
        }`}
      >
        {checked && <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />}
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function AlertComposer() {
  const [severity, setSeverity] = useState<'Critical' | 'Warning' | 'Watch'>('Warning');
  const [selectedState, setSelectedState] = useState<string>('Nagaland');
  const [targetType, setTargetType] = useState<'corridor' | 'village'>('corridor');
  const [targetLocation, setTargetLocation] = useState<string>('NH-29: Dimapur – Kohima – Mao Highway');
  const [locationDetails, setLocationDetails] = useState<string>('KM 44, Dzüdza River Stretch');

  const [audiences, setAudiences] = useState<('Villagers' | 'Drivers' | 'Field Teams')[]>([
    'Villagers',
    'Drivers',
  ]);

  const [channels, setChannels] = useState<('App Notification' | 'SMS' | 'IVRS Voice Call')[]>([
    'App Notification',
    'SMS',
  ]);

  const [title, setTitle] = useState<string>('Heavy Slope Displacement & Mudflow Advisory');
  const [description, setDescription] = useState<string>(
    'Torrential hillside runoff has destabilized upper slope cutting, depositing rocks and liquefied mud across roadway. Geotechnical sensors report critical soil saturation.'
  );
  const [advisory, setAdvisory] = useState<string>(
    'Avoid this stretch. Drivers must hold at designated staging checkpoints. Villagers monitor hillside runoff and report widening ground cracks.'
  );

  const [activeLanguage, setActiveLanguage] = useState<'Assamese' | 'Hindi' | 'Bengali' | 'Nagamese' | 'English'>('Assamese');
  const [previewTab, setPreviewTab] = useState<'sms' | 'push' | 'ivrs'>('push');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [availableCorridors, setAvailableCorridors] = useState<PublicRoadStatusItem[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadRoads() {
      try {
        const roads = await publicApi.getRoadStatus();
        if (mounted && roads && roads.length > 0) {
          setAvailableCorridors(roads);
          const match = roads.find((r) => r.state.toLowerCase() === 'nagaland');
          if (match) {
            setTargetLocation(`${match.code} - ${match.name}`);
          }
        }
      } catch {
        // Fallback default corridor remains active
      }
    }
    void loadRoads();
    return () => {
      mounted = false;
    };
  }, []);

  const syncLocationForScope = (nextState: string, nextType: 'corridor' | 'village') => {
    if (nextType === 'corridor') {
      const match = availableCorridors.find(
        (r) => r.state.toLowerCase() === nextState.toLowerCase()
      );
      if (match) {
        setTargetLocation(`${match.code} - ${match.name}`);
      } else {
        setTargetLocation(`${nextState} Primary Highway Corridor`);
      }
    } else {
      const villages = KNOWN_VILLAGES[nextState] || [];
      if (villages.length > 0) {
        setTargetLocation(villages[0]);
      }
    }
  };

  const handleStateChange = (nextState: string) => {
    setSelectedState(nextState);
    syncLocationForScope(nextState, targetType);
  };

  const handleTargetTypeChange = (nextType: 'corridor' | 'village') => {
    setTargetType(nextType);
    syncLocationForScope(selectedState, nextType);
  };

  const handleApplyTemplate = (tpl: EmergencyTemplate) => {
    setSelectedTemplate(tpl.name);
    setSeverity(tpl.severity);
    setSelectedState(tpl.suggestedState);
    setTargetType(tpl.targetType);
    setTitle(tpl.title.slice(0, TITLE_MAX));
    setDescription(tpl.description.slice(0, BODY_MAX));
    setAdvisory(tpl.advisory.slice(0, BODY_MAX));
    if (tpl.landmark) setLocationDetails(tpl.landmark);
    syncLocationForScope(tpl.suggestedState, tpl.targetType);
    setFormErrors([]);
  };

  const toggleAudience = (aud: 'Villagers' | 'Drivers' | 'Field Teams') => {
    setAudiences((prev) =>
      prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud]
    );
  };

  const toggleChannel = (ch: 'App Notification' | 'SMS' | 'IVRS Voice Call') => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const generateVernacularPreview = (lang: string): string => {
    const loc = targetLocation.split(':')[0].split('-')[0].trim();
    if (lang === 'Assamese') {
      if (severity === 'Critical') {
        return `জৰুৰী সতৰ্কবাণী (${loc}): ${selectedState}ৰ এই এলেকাত ভূমিস্খলনৰ তীব্র আশংকা। ${advisory} জৰুৰী সহায়ৰ বাবে ১০৭৭ নম্বৰত যোগাযোগ কৰক।`;
      }
      if (severity === 'Warning') {
        return `সতৰ্কবাণী (${loc}): ${selectedState} পথত ভূমিস্খলনৰ আশংকা বৃদ্ধি পাইছে। চালকসকলে নিৰ্ধাৰিত স্থানত অপেক্ষা কৰক। ${advisory}`;
      }
      return `পূৰ্বাভাস (${loc}): ${selectedState} এলেকাত বৰষুণৰ ফলত মাটি কোমল হৈছে। ভূমিৰ ফাট লক্ষ্য কৰিলে ততালিকে জনাওক।`;
    }

    if (lang === 'Hindi') {
      if (severity === 'Critical') {
        return `आपातकालीन चेतावनी (${loc}): ${selectedState} क्षेत्र में भारी भूस्खलन व सड़क अवरोध। ${advisory} आपात स्थिति में 1077 डायल करें।`;
      }
      if (severity === 'Warning') {
        return `चेतावनी (${loc}): ${selectedState} कॉरिडोर पर मिट्टी धंसने की संभावना है। वाहन धीमी गति से चलाएं। ${advisory}`;
      }
      return `निगरानी अलर्ट (${loc}): ${selectedState} क्षेत्र में भारी वर्षा से ढलान अस्थिर हो सकती है। सुरक्षित रहें।`;
    }

    if (lang === 'Bengali') {
      if (severity === 'Critical') {
        return `জরুরি সতর্কতা (${loc}): ${selectedState} অংশে ভূমিধসের কারণে রাস্তা বন্ধ। ${advisory} জরুরি প্রয়োজনে কন্ট্রোল রুমে যোগাযোগ করুন।`;
      }
      if (severity === 'Warning') {
        return `সতর্কবার্তা (${loc}): ${selectedState} এলাকায় পাহাড়ি ধসের আশঙ্কা। অতিরিক্ত সতর্কতা অবলম্বন করুন। ${advisory}`;
      }
      return `পর্যবেক্ষণ সতর্কতা (${loc}): ${selectedState} অঞ্চলে মাটির আর্দ্রতা বৃদ্ধি পেয়েছে। সতর্ক থাকুন।`;
    }

    if (lang === 'Nagamese') {
      if (severity === 'Critical') {
        return `Emergency Alert (${loc}): ${selectedState} jaga te pahar bhangi kena rasta bondh hoise. Manu khan safe jaga te jabi. ${advisory}`;
      }
      if (severity === 'Warning') {
        return `Hushiar Alert (${loc}): ${selectedState} rasta te barish karone mitti khosibo pare. Gari chalai kene dhyan dibi. ${advisory}`;
      }
      return `Notice (${loc}): ${selectedState} jaga te bishi barish hoise. Pahar te crack dekhile Gaon Burah ke jani dibi.`;
    }

    return `Official Landslide Alert [${severity}]: ${title} — Target: ${targetLocation} (${selectedState}). ${advisory}`;
  };

  const localizedPreviewText = generateVernacularPreview(activeLanguage);

  const handleReviewClick = () => {
    const errors: string[] = [];
    if (!title.trim()) errors.push('Advisory Title is required');
    if (!description.trim()) errors.push('Hazard Description is required');
    if (!advisory.trim()) errors.push('Recommended Public Advisory is required');
    if (audiences.length === 0) errors.push('Select at least one Target Audience');
    if (channels.length === 0) errors.push('Select at least one Delivery Channel');
    if (!targetLocation.trim()) errors.push('Target location or corridor is required');

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);
    setIsReviewOpen(true);
  };

  const draftData: AlertDraftData = {
    severity,
    targetType,
    state: selectedState,
    targetLocation,
    audiences,
    channels,
    title,
    locationDetails,
    description,
    advisory,
    localLanguage: activeLanguage,
    localizedText: localizedPreviewText,
  };

  const filteredCorridors = availableCorridors.filter(
    (r) => r.state.toLowerCase() === selectedState.toLowerCase()
  );

  return (
    <div className="space-y-5">
      <AlertReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={draftData}
      />

      {/* ── Composer Banner Header with Subtle Mountain Silhouette ── */}
      <AlertSectionBanner
        icon={<Megaphone className="w-5 h-5" strokeWidth={2} />}
        title="Compose Emergency Advisory"
        subtitle="Create, preview and dispatch multi-channel alerts with local language support."
        showPineTrees
        badge={
          <StatusBadge
            status={severity}
            size="xs"
            pulse={severity === 'Critical'}
            label={`${severity} Priority`}
          />
        }
      />

      {/* Validation Errors Notice */}
      {formErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FDECEC] border border-red-300/80 text-red-900 text-xs">
          <span className="font-extrabold block mb-1">Please correct the following before review:</span>
          <ul className="list-disc list-inside space-y-0.5 text-red-800">
            {formErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Main 2-Column Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Structured Alert Composer Card (7 cols) */}
        <div className="lg:col-span-7 bg-[#FAF8F2] border border-[#173D32]/12 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          {/* 1. Alert Severity Level */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-extrabold text-[#173D32]">
                <Shield className="w-4 h-4 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                <span>Alert Severity Level</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Watch */}
              <button
                type="button"
                onClick={() => setSeverity('Watch')}
                className={`px-3.5 py-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                  severity === 'Watch'
                    ? 'bg-[#EEF6EC] border-[#3F7A4D] ring-1 ring-[#3F7A4D]/25 shadow-2xs'
                    : 'bg-[#F8F6EE] border-[#173D32]/12 hover:bg-white hover:border-[#3F7A4D]/40'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Zap
                    className="w-4 h-4 text-[#3F7A4D] shrink-0 mt-0.5"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-[13px] font-extrabold text-[#285E36] block leading-tight">
                      Watch
                    </span>
                    <span className="text-[11px] text-[#173D32]/70 font-medium leading-tight block mt-0.5">
                      Precautionary monitoring
                    </span>
                  </div>
                </div>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    severity === 'Watch'
                      ? 'border-[#3F7A4D] bg-[#3F7A4D]'
                      : 'border-[#173D32]/25 bg-white'
                  }`}
                >
                  {severity === 'Watch' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </button>

              {/* Warning */}
              <button
                type="button"
                onClick={() => setSeverity('Warning')}
                className={`px-3.5 py-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                  severity === 'Warning'
                    ? 'bg-[#FBF0D4] border-[#D98B1C] ring-1 ring-[#D98B1C]/30 shadow-2xs'
                    : 'bg-[#FDF9EE] border-[#173D32]/12 hover:bg-white hover:border-[#D98B1C]/45'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertTriangle
                    className="w-4 h-4 text-[#C26D08] shrink-0 mt-0.5"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-[13px] font-extrabold text-[#9A5B06] block leading-tight">
                      Warning
                    </span>
                    <span className="text-[11px] text-[#7A5114]/80 font-medium leading-tight block mt-0.5">
                      High slope risk detected
                    </span>
                  </div>
                </div>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    severity === 'Warning'
                      ? 'border-[#9A5B06] bg-[#9A5B06]'
                      : 'border-[#173D32]/25 bg-white'
                  }`}
                >
                  {severity === 'Warning' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </button>

              {/* Critical */}
              <button
                type="button"
                onClick={() => setSeverity('Critical')}
                className={`px-3.5 py-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                  severity === 'Critical'
                    ? 'bg-[#FCE8EA] border-[#DC2626] ring-1 ring-[#DC2626]/25 shadow-2xs'
                    : 'bg-[#FDF2F2] border-[#173D32]/12 hover:bg-white hover:border-[#DC2626]/45'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertCircle
                    className="w-4 h-4 text-[#C52936] shrink-0 mt-0.5"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-[13px] font-extrabold text-[#A61E2A] block leading-tight">
                      Critical
                    </span>
                    <span className="text-[11px] text-[#7F232C]/80 font-medium leading-tight block mt-0.5">
                      Immediate life safety / evacuate
                    </span>
                  </div>
                </div>
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    severity === 'Critical'
                      ? 'border-[#C52936] bg-[#C52936]'
                      : 'border-[#173D32]/25 bg-white'
                  }`}
                >
                  {severity === 'Critical' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </button>
            </div>
          </div>

          {/* 2. Targeting & Scope */}
          <div className="pt-4 border-t border-[#173D32]/10 space-y-3.5">
            <span className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-extrabold text-[#173D32]">
              <MapPin className="w-4 h-4 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
              <span>Targeting &amp; Scope</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#173D32]/80 block mb-1.5">
                  State Jurisdiction <span className="text-[#C52936]">*</span>
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#173D32]/14 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]/20 cursor-pointer shadow-2xs"
                >
                  {NORTHEAST_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#173D32]/80 block mb-1.5">
                  Target Category <span className="text-[#C52936]">*</span>
                </label>
                <div className="flex rounded-xl bg-white border border-[#173D32]/14 p-1 h-10 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleTargetTypeChange('corridor')}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                      targetType === 'corridor'
                        ? 'bg-[#173D32] text-[#F6F4EC] shadow-2xs'
                        : 'text-[#173D32]/75 hover:text-[#173D32]'
                    }`}
                  >
                    <Route className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Highway Corridor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTargetTypeChange('village')}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                      targetType === 'village'
                        ? 'bg-[#173D32] text-[#F6F4EC] shadow-2xs'
                        : 'text-[#173D32]/75 hover:text-[#173D32]'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Specific Village</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#173D32]/80 block mb-1.5">
                  {targetType === 'corridor' ? 'Monitored Highway Stretch' : 'Designated Village'}{' '}
                  <span className="text-[#C52936]">*</span>
                </label>
                {targetType === 'corridor' ? (
                  <select
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-[#173D32]/14 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]/20 cursor-pointer shadow-2xs"
                  >
                    {filteredCorridors.length > 0 ? (
                      filteredCorridors.map((r) => (
                        <option key={r.id} value={`${r.code} - ${r.name}`}>
                          {r.code}: {r.name} ({r.stretch})
                        </option>
                      ))
                    ) : (
                      <option value={targetLocation}>{targetLocation}</option>
                    )}
                  </select>
                ) : (
                  <select
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-[#173D32]/14 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]/20 cursor-pointer shadow-2xs"
                  >
                    {(KNOWN_VILLAGES[selectedState] || ['Phesama (Kohima)']).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#173D32]/80 block mb-1.5">
                  Exact Milestone / Landmark <span className="text-[#C52936]">*</span>
                </label>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="e.g. KM 44, Dzüdza River Stretch"
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#173D32]/14 text-xs font-medium text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-2 focus:ring-[#173D32]/20 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* 3. Target Audience & Delivery Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/80 border border-[#173D32]/10 shadow-2xs">
              <span className="inline-flex items-center gap-2 text-xs font-extrabold text-[#173D32] mb-3">
                <Users className="w-3.5 h-3.5 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                <span>
                  Target Audience <span className="text-[#C52936]">*</span>
                </span>
              </span>
              <div className="flex flex-col gap-2.5">
                {(['Villagers', 'Drivers', 'Field Teams'] as const).map((aud) => (
                  <CustomCheckbox
                    key={aud}
                    checked={audiences.includes(aud)}
                    onChange={() => toggleAudience(aud)}
                    label={aud}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-[#173D32]/10 shadow-2xs">
              <span className="inline-flex items-center gap-2 text-xs font-extrabold text-[#173D32] mb-3">
                <Send className="w-3.5 h-3.5 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                <span>
                  Delivery Channels <span className="text-[#C52936]">*</span>
                </span>
              </span>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <CustomCheckbox
                    checked={channels.includes('App Notification')}
                    onChange={() => toggleChannel('App Notification')}
                    label="App Notification"
                  />
                  <span className="text-[10px] text-[#166534] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded-full whitespace-nowrap">
                    In-App Ready
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <CustomCheckbox
                    checked={channels.includes('SMS')}
                    onChange={() => toggleChannel('SMS')}
                    label="SMS Broadcast"
                  />
                  <span className="text-[10px] text-[#9A5B06] font-bold bg-[#FEEFD6] px-2 py-0.5 rounded-full whitespace-nowrap">
                    Gateway Unconfigured
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <CustomCheckbox
                    checked={channels.includes('IVRS Voice Call')}
                    onChange={() => toggleChannel('IVRS Voice Call')}
                    label="IVRS Voice Call"
                  />
                  <span className="text-[10px] text-[#9A5B06] font-bold bg-[#FEEFD6] px-2 py-0.5 rounded-full whitespace-nowrap">
                    Telephony Unconfigured
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Message Composition Fields */}
          <div className="pt-2 space-y-4">
            <div>
              <label className="inline-flex items-center gap-2 text-xs font-extrabold text-[#173D32] mb-1.5">
                <FileText className="w-3.5 h-3.5 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                <span>
                  Advisory Title <span className="text-[#C52936]">*</span>
                </span>
              </label>
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/14 focus-within:ring-2 focus-within:ring-[#173D32]/20 shadow-2xs">
                <input
                  type="text"
                  maxLength={TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Clear headline indicating hazard and corridor"
                  className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13px] font-bold text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none"
                />
                <span className="text-[11px] font-semibold text-[#173D32]/50 tabular-nums shrink-0">
                  {title.length} / {TITLE_MAX}
                </span>
              </div>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 text-xs font-extrabold text-[#173D32] mb-1.5">
                <Activity className="w-3.5 h-3.5 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                <span>
                  Hazard Description &amp; Geotechnical Telemetry <span className="text-[#C52936]">*</span>
                </span>
              </label>
              <div className="relative rounded-xl bg-white border border-[#173D32]/14 focus-within:ring-2 focus-within:ring-[#173D32]/20 shadow-2xs px-3.5 py-2.5 pb-6">
                <textarea
                  rows={3}
                  maxLength={BODY_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe slope movement, moisture percentage, weather conditions..."
                  className="w-full bg-transparent text-xs text-[#173D32] leading-relaxed placeholder:text-[#173D32]/40 focus:outline-none resize-none"
                />
                <span className="absolute right-3.5 bottom-2 text-[11px] font-semibold text-[#173D32]/50 tabular-nums pointer-events-none">
                  {description.length} / {BODY_MAX}
                </span>
              </div>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 text-xs font-extrabold text-[#173D32] mb-1.5">
                <Signpost className="w-3.5 h-3.5 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                <span>
                  Recommended Public Advisory &amp; Routing Directive <span className="text-[#C52936]">*</span>
                </span>
              </label>
              <div className="relative rounded-xl bg-white border border-[#173D32]/14 focus-within:ring-2 focus-within:ring-[#173D32]/20 shadow-2xs px-3.5 py-2.5 pb-6">
                <textarea
                  rows={2}
                  maxLength={BODY_MAX}
                  value={advisory}
                  onChange={(e) => setAdvisory(e.target.value)}
                  placeholder="Clear directive: Evacuate, avoid transit, hold at checkpoint, follow police..."
                  className="w-full bg-transparent text-xs text-[#173D32] leading-relaxed placeholder:text-[#173D32]/40 focus:outline-none resize-none"
                />
                <span className="absolute right-3.5 bottom-2 text-[11px] font-semibold text-[#173D32]/50 tabular-nums pointer-events-none">
                  {advisory.length} / {BODY_MAX}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Templates, Vernacular & Broadcast Previews, Approval CTA (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          {/* Quick Template Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#EAF0E6] border border-[#173D32]/10 flex items-center justify-center text-[#173D32] shrink-0">
                <FileText className="w-3.5 h-3.5" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className="text-xs sm:text-[13px] font-extrabold text-[#173D32]">
                Quick Template
              </span>
            </div>
            <select
              aria-label="Load emergency preset template"
              value={selectedTemplate}
              onChange={(e) => {
                const tpl = TEMPLATES.find((t) => t.name === e.target.value);
                if (tpl) handleApplyTemplate(tpl);
              }}
              className="w-full h-10 px-3 rounded-xl bg-white border border-[#173D32]/14 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]/20 cursor-pointer shadow-2xs"
            >
              <option value="" disabled>
                Load Emergency Preset...
              </option>
              {TEMPLATES.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language Preview Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-extrabold text-[#173D32]">
                <Globe className="w-4 h-4 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                <span>Language Preview</span>
              </span>
              <span className="text-[10px] text-[#173D32] font-bold bg-[#EAF0E6] border border-[#173D32]/10 px-2.5 py-0.5 rounded-full">
                Northeast Vernacular
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(['Assamese', 'Hindi', 'Bengali', 'Nagamese', 'English'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeLanguage === lang
                      ? 'bg-[#173D32] text-[#F6F4EC] shadow-2xs'
                      : 'bg-white text-[#173D32]/80 hover:bg-[#EAF0E6]/60 border border-[#173D32]/12'
                  }`}
                >
                  {lang === 'Assamese'
                    ? 'অসমীয়া'
                    : lang === 'Hindi'
                    ? 'हिन्दी'
                    : lang === 'Bengali'
                    ? 'বাংলা'
                    : lang}
                </button>
              ))}
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#173D32]/10 text-xs text-[#173D32]/90 leading-relaxed font-sans min-h-[92px]">
              {localizedPreviewText}
            </div>
          </div>

          {/* Broadcast Preview Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F2] border border-[#173D32]/12 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-extrabold text-[#173D32]">
                <Radio className="w-4 h-4 text-[#173D32]" strokeWidth={2.2} aria-hidden="true" />
                <span>Broadcast Preview</span>
              </span>

              <div className="flex rounded-lg bg-[#EFECE3] border border-[#173D32]/12 p-0.5 text-[11px] font-bold">
                {(['push', 'sms', 'ivrs'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPreviewTab(tab)}
                    className={`px-2.5 py-1 rounded-md cursor-pointer transition-all uppercase tracking-wide text-[10px] ${
                      previewTab === tab
                        ? 'bg-[#173D32] text-[#F6F4EC] shadow-2xs'
                        : 'text-[#173D32]/70 hover:text-[#173D32]'
                    }`}
                  >
                    {tab === 'push' ? 'Push' : tab.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Push Preview */}
            {previewTab === 'push' && (
              <div className="p-3.5 rounded-xl bg-white border border-[#173D32]/10 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#173D32] text-[#F6F4EC] flex items-center justify-center shrink-0">
                      <Mountain className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-extrabold text-[#173D32]">
                      Terra360 Emergency
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-[#173D32]/50">now</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={severity} size="xs" />
                    <span className="text-xs font-extrabold text-[#173D32] leading-snug">
                      {title || 'Untitled Advisory'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#173D32]/80 leading-relaxed line-clamp-2">
                    {advisory}
                  </p>
                </div>
              </div>
            )}

            {/* SMS Preview */}
            {previewTab === 'sms' && (
              <div className="p-3.5 rounded-xl bg-white border border-[#173D32]/10 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] text-[#173D32]/60 pb-1.5 border-b border-[#173D32]/10 font-mono">
                  <span>Sender: [GOV-TERRA360]</span>
                  <span>DLT Reg # 140226</span>
                </div>
                <p className="text-xs font-mono text-[#173D32]/90 leading-relaxed bg-[#FAF8F2] p-2.5 rounded-lg border border-[#173D32]/10">
                  TERRA360 [{severity.toUpperCase()} ALERT]: {title}. Location: {targetLocation}.{' '}
                  {advisory}. Helplines: 1077.
                </p>
                <div className="text-[10px] text-[#173D32]/60 flex items-center justify-between font-medium">
                  <span>Target: {audiences.join(', ') || 'None selected'}</span>
                  <span>
                    Estimated:{' '}
                    {Math.max(
                      1,
                      Math.ceil((title.length + targetLocation.length + advisory.length + 55) / 160)
                    )}{' '}
                    SMS Part
                  </span>
                </div>
              </div>
            )}

            {/* IVRS Voice Call Preview */}
            {previewTab === 'ivrs' && (
              <div className="p-3.5 rounded-xl bg-white border border-[#173D32]/10 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#173D32] bg-[#EAF0E6]/70 p-2 rounded-lg border border-[#173D32]/12">
                  <span className="flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>IVRS Vernacular TTS Script</span>
                  </span>
                  <span className="text-[10px] font-mono">0:24s</span>
                </div>
                <div className="text-xs text-[#173D32]/85 italic bg-[#FAF8F2] p-2.5 rounded-lg border border-[#173D32]/10 leading-relaxed">
                  &quot;[Alert tone] Automated disaster bulletin from Terra360 State Emergency Operations Center. {localizedPreviewText} Press 1 to repeat, press 9 for district emergency desk.&quot;
                </div>
              </div>
            )}
          </div>

          {/* Primary Review & Approve CTA Button */}
          <button
            type="button"
            onClick={handleReviewClick}
            className="w-full h-12 rounded-2xl bg-[#173D32] hover:bg-[#1a4437] active:scale-[0.99] text-[#F6F4EC] text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Send className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
            <span>Review &amp; Approve Alert</span>
          </button>
        </div>
      </div>
    </div>
  );
}
