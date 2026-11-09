'use client';

import React, { useState, useEffect } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import AlertReviewModal, { AlertDraftData } from './AlertReviewModal';
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
  },
];

export default function AlertComposer() {
  const [severity, setSeverity] = useState<'Critical' | 'Warning' | 'Watch'>('Warning');
  const [selectedState, setSelectedState] = useState<string>('Nagaland');
  const [targetType, setTargetType] = useState<'corridor' | 'village'>('corridor');
  const [targetLocation, setTargetLocation] = useState<string>('NH-29');
  const [locationDetails, setLocationDetails] = useState<string>('KM 44, Dzüdza River Stretch');

  // Audiences: Villagers, Drivers, Field Teams
  const [audiences, setAudiences] = useState<('Villagers' | 'Drivers' | 'Field Teams')[]>([
    'Villagers',
    'Drivers',
  ]);

  // Delivery channels: App Notification, SMS, IVRS Voice Call
  const [channels, setChannels] = useState<('App Notification' | 'SMS' | 'IVRS Voice Call')[]>([
    'App Notification',
    'SMS',
  ]);

  // Message composition
  const [title, setTitle] = useState<string>('Heavy Slope Displacement & Mudflow Advisory');
  const [description, setDescription] = useState<string>(
    'Torrential hillside runoff has destabilized upper slope cutting, depositing rocks and liquefied mud across roadway. Geotechnical sensors report critical soil saturation.'
  );
  const [advisory, setAdvisory] = useState<string>(
    'Avoid this stretch. Drivers must hold at designated staging checkpoints. Villagers monitor hillside runoff and report widening ground cracks.'
  );

  // Local Language Preview state
  const [activeLanguage, setActiveLanguage] = useState<'Assamese' | 'Hindi' | 'Bengali' | 'Nagamese' | 'English'>('Assamese');
  const [previewTab, setPreviewTab] = useState<'sms' | 'push' | 'ivrs'>('push');

  // Backend Corridors loaded dynamically from existing API
  const [availableCorridors, setAvailableCorridors] = useState<PublicRoadStatusItem[]>([]);
  const [isLoadingCorridors, setIsLoadingCorridors] = useState<boolean>(true);

  // Review Modal state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Fetch real roads from backend to populate corridor target selection
  useEffect(() => {
    let mounted = true;
    async function loadRoads() {
      try {
        const roads = await publicApi.getRoadStatus();
        if (mounted && roads && roads.length > 0) {
          setAvailableCorridors(roads);
          // Set initial corridor matching selected state if possible
          const match = roads.find((r) => r.state.toLowerCase() === selectedState.toLowerCase());
          if (match) {
            setTargetLocation(`${match.code} - ${match.name}`);
          }
        }
      } catch {
        // Fallback default corridors
      } finally {
        if (mounted) setIsLoadingCorridors(false);
      }
    }
    void loadRoads();
    return () => {
      mounted = false;
    };
  }, []);

  // Sync corridor selection when state changes
  useEffect(() => {
    if (targetType === 'corridor' && availableCorridors.length > 0) {
      const match = availableCorridors.find(
        (r) => r.state.toLowerCase() === selectedState.toLowerCase()
      );
      if (match) {
        setTargetLocation(`${match.code} - ${match.name}`);
      }
    } else if (targetType === 'village') {
      const villages = KNOWN_VILLAGES[selectedState] || [];
      if (villages.length > 0) {
        setTargetLocation(villages[0]);
      }
    }
  }, [selectedState, targetType, availableCorridors]);

  // Load a quick template preset
  const handleApplyTemplate = (tpl: EmergencyTemplate) => {
    setSeverity(tpl.severity);
    setSelectedState(tpl.suggestedState);
    setTargetType(tpl.targetType);
    setTitle(tpl.title);
    setDescription(tpl.description);
    setAdvisory(tpl.advisory);
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

  // Generate vernacular emergency translation preview
  const generateVernacularPreview = (lang: string): string => {
    const loc = targetLocation.split('-')[0].trim();
    if (lang === 'Assamese') {
      if (severity === 'Critical') {
        return `জৰুৰী সতৰ্কবাণী [গুৰুতৰ]: ${selectedState}ৰ ${loc} এলেকাত ভূমিস্খলনৰ তীব্র আশংকা। ${advisory} জৰুৰী সহায়ৰ বাবে ১০৭৭ নম্বৰত যোগাযোগ কৰক।`;
      }
      if (severity === 'Warning') {
        return `সতৰ্কবাণী [সতৰ্কতা]: ${selectedState}ৰ ${loc} পথত ভূমিস্খলনৰ আশংকা বৃদ্ধি পাইছে। চালক আৰু গাঁওবাসীয়ে সাৱধানতা অৱলম্বন কৰক। ${advisory}`;
      }
      return `পূৰ্বাভাস [নজৰ]: ${selectedState}ৰ ${loc} এলেকাত বৰষুণৰ ফলত মাটি কোমল হৈছে। ভূমিৰ ফাট লক্ষ্য কৰিলে ততালিকে জনাওক।`;
    }

    if (lang === 'Hindi') {
      if (severity === 'Critical') {
        return `आपातकालीन चेतावनी [अति गंभीर]: ${selectedState} के ${loc} क्षेत्र में भारी भूस्खलन व सड़क अवरोध। ${advisory} आपात स्थिति में 1077 डायल करें।`;
      }
      if (severity === 'Warning') {
        return `चेतावनी [सावधानी]: ${selectedState} के ${loc} कॉरिडोर पर मिट्टी धंसने की संभावना है। वाहन धीमी गति से चलाएं। ${advisory}`;
      }
      return `निगरानी अलर्ट [सतर्कता]: ${selectedState} के ${loc} क्षेत्र में भारी वर्षा से ढलान अस्थिर हो सकती है। सुरक्षित रहें।`;
    }

    if (lang === 'Bengali') {
      if (severity === 'Critical') {
        return `জরুরি সতর্কতা [সংকটজনক]: ${selectedState} এর ${loc} অংশে ভূমিধসের কারণে রাস্তা বন্ধ। ${advisory} জরুরি প্রয়োজনে কন্ট্রোল রুমে যোগাযোগ করুন।`;
      }
      if (severity === 'Warning') {
        return `সতর্কবার্তা [সতর্কতা]: ${selectedState} এর ${loc} এলাকায় পাহাড়ি ধসের আশঙ্কা। অতিরিক্ত সতর্কতা অবলম্বন করুন। ${advisory}`;
      }
      return `পর্যবেক্ষণ সতর্কতা [নজরদারি]: ${selectedState} এর ${loc} অঞ্চলে মাটির আর্দ্রতা বৃদ্ধি পেয়েছে। সতর্ক থাকুন।`;
    }

    if (lang === 'Nagamese') {
      if (severity === 'Critical') {
        return `Emergency Alert [Critical]: ${selectedState} ${loc} jaga te pahar bhangi kena rasta bondh hoise. Manu khan safe jaga te jabi. ${advisory}`;
      }
      if (severity === 'Warning') {
        return `Hushiar Alert [Warning]: ${selectedState} ${loc} rasta te barish karone mitti khosibo pare. Gari chalai kene dhyan dibi. ${advisory}`;
      }
      return `Notice [Watch]: ${selectedState} ${loc} jaga te bishi barish hoise. Pahar te crack dekhile Gaon Burah ke jani dibi.`;
    }

    // English (Default)
    return `Official Landslide Alert [${severity}]: ${title} - Target: ${targetLocation} (${selectedState}). ${description} Mandatory Advisory: ${advisory}`;
  };

  const localizedPreviewText = generateVernacularPreview(activeLanguage);

  // Validate form before opening review
  const handleReviewClick = () => {
    const errors: string[] = [];
    if (!title.trim()) errors.push('Alert Title is required');
    if (!description.trim()) errors.push('Hazard Description is required');
    if (!advisory.trim()) errors.push('Recommended Advisory is required');
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

  return (
    <div className="space-y-6">
      {/* Review & Confirmation Modal */}
      <AlertReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        draft={draftData}
      />

      {/* Top Composer Card */}
      <div className="p-5 sm:p-7 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs">
        <SectionHeader
          title="Compose & Dispatch Emergency Advisory"
          subtitle="Formulate targeted multi-channel alerts with local language translation and channel telemetry previews."
          icon="📢"
          badge={
            <StatusBadge
              status={severity}
              size="sm"
              pulse={severity === 'Critical'}
              label={`${severity} Priority`}
            />
          }
          actions={
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#173D32]/60 hidden md:inline">
                Quick Template:
              </span>
              <select
                onChange={(e) => {
                  const tpl = TEMPLATES.find((t) => t.name === e.target.value);
                  if (tpl) handleApplyTemplate(tpl);
                }}
                defaultValue=""
                className="h-8 px-2.5 rounded-xl bg-[#F6F4EC] border border-[#173D32]/20 text-xs font-semibold text-[#173D32] focus:outline-none cursor-pointer"
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
          }
        />

        {/* Validation Errors Notice */}
        {formErrors.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs">
            <span className="font-extrabold block mb-1">Please correct the following before review:</span>
            <ul className="list-disc list-inside space-y-0.5 text-red-800">
              {formErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Composer Form (8 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Alert Severity Selection Cards */}
            <div>
              <label className="text-xs uppercase font-extrabold text-[#173D32] tracking-wider block mb-2">
                1. Alert Severity Level
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Watch */}
                <button
                  type="button"
                  onClick={() => setSeverity('Watch')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    severity === 'Watch'
                      ? 'bg-yellow-500/10 border-yellow-500 ring-2 ring-yellow-500/20'
                      : 'bg-[#F6F4EC] border-[#173D32]/10 hover:border-[#173D32]/25'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">⚡</span>
                    {severity === 'Watch' && (
                      <span className="text-[10px] font-black uppercase text-yellow-800">Active</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-yellow-900 block">Watch</span>
                    <span className="text-[10px] text-yellow-800/80 font-medium leading-tight block mt-0.5">
                      Precautionary monitoring
                    </span>
                  </div>
                </button>

                {/* Warning */}
                <button
                  type="button"
                  onClick={() => setSeverity('Warning')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    severity === 'Warning'
                      ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-[#F6F4EC] border-[#173D32]/10 hover:border-[#173D32]/25'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">🟡</span>
                    {severity === 'Warning' && (
                      <span className="text-[10px] font-black uppercase text-amber-800">Active</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-amber-900 block">Warning</span>
                    <span className="text-[10px] text-amber-800/80 font-medium leading-tight block mt-0.5">
                      High slope risk detected
                    </span>
                  </div>
                </button>

                {/* Critical */}
                <button
                  type="button"
                  onClick={() => setSeverity('Critical')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    severity === 'Critical'
                      ? 'bg-red-500/10 border-red-500 ring-2 ring-red-500/20'
                      : 'bg-[#F6F4EC] border-[#173D32]/10 hover:border-[#173D32]/25'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">🔴</span>
                    {severity === 'Critical' && (
                      <span className="text-[10px] font-black uppercase text-red-800">Active</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-black text-red-900 block">Critical</span>
                    <span className="text-[10px] text-red-800/80 font-medium leading-tight block mt-0.5">
                      Immediate life safety / evacuate
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Target Selection (State, Type, Location) */}
            <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10 space-y-3">
              <span className="text-xs uppercase font-extrabold text-[#173D32] tracking-wider block">
                2. Target Geo-Location & Scope
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* State selector */}
                <div>
                  <label className="text-[11px] font-bold text-[#173D32]/70 block mb-1">
                    State Jurisdiction:
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-white border border-[#173D32]/20 text-xs font-bold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
                  >
                    {NORTHEAST_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Scope Type */}
                <div>
                  <label className="text-[11px] font-bold text-[#173D32]/70 block mb-1">
                    Target Category:
                  </label>
                  <div className="flex rounded-xl bg-white border border-[#173D32]/20 p-0.5 h-9">
                    <button
                      type="button"
                      onClick={() => setTargetType('corridor')}
                      className={`flex-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        targetType === 'corridor'
                          ? 'bg-[#173D32] text-[#F6F4EC]'
                          : 'text-[#173D32]/70 hover:text-[#173D32]'
                      }`}
                    >
                      🛣️ Highway Corridor
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType('village')}
                      className={`flex-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        targetType === 'village'
                          ? 'bg-[#173D32] text-[#F6F4EC]'
                          : 'text-[#173D32]/70 hover:text-[#173D32]'
                      }`}
                    >
                      🏡 Specific Village
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Location Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-[#173D32]/70 block mb-1">
                    {targetType === 'corridor' ? 'Monitored Highway Stretch:' : 'Designated Village:'}
                  </label>
                  {targetType === 'corridor' ? (
                    <select
                      value={targetLocation}
                      onChange={(e) => setTargetLocation(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white border border-[#173D32]/20 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
                    >
                      {availableCorridors.length > 0 ? (
                        availableCorridors
                          .filter(
                            (r) =>
                              r.state.toLowerCase() === selectedState.toLowerCase() ||
                              selectedState === 'All States'
                          )
                          .map((r) => (
                            <option key={r.id} value={`${r.code} - ${r.name}`}>
                              {r.code}: {r.name} ({r.stretch})
                            </option>
                          ))
                      ) : (
                        <option value="NH-29">NH-29 - Dimapur to Kohima Corridor</option>
                      )}
                    </select>
                  ) : (
                    <select
                      value={targetLocation}
                      onChange={(e) => setTargetLocation(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-white border border-[#173D32]/20 text-xs font-semibold text-[#173D32] focus:outline-none focus:ring-1 focus:ring-[#173D32] cursor-pointer"
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
                  <label className="text-[11px] font-bold text-[#173D32]/70 block mb-1">
                    Exact Milestone / Landmark:
                  </label>
                  <input
                    type="text"
                    value={locationDetails}
                    onChange={(e) => setLocationDetails(e.target.value)}
                    placeholder="e.g. KM 44, Dzüdza River Bridge"
                    className="w-full h-9 px-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
                  />
                </div>
              </div>
            </div>

            {/* 3. Audience & Delivery Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Audience */}
              <div className="p-3.5 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
                <span className="text-[11px] uppercase font-bold text-[#173D32]/80 block tracking-wider mb-2">
                  👥 Target Audience:
                </span>
                <div className="space-y-2">
                  {(['Villagers', 'Drivers', 'Field Teams'] as const).map((aud) => (
                    <label
                      key={aud}
                      className="flex items-center gap-2 text-xs font-semibold text-[#173D32] cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={audiences.includes(aud)}
                        onChange={() => toggleAudience(aud)}
                        className="w-4 h-4 rounded border-[#173D32]/30 text-[#173D32] focus:ring-[#173D32] cursor-pointer"
                      />
                      <span>{aud}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Delivery Channels */}
              <div className="p-3.5 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase font-bold text-[#173D32]/80 tracking-wider">
                    📡 Delivery Channels:
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                    M4 Gateway Check
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="flex items-center gap-2 font-semibold text-[#173D32]">
                      <input
                        type="checkbox"
                        checked={channels.includes('App Notification')}
                        onChange={() => toggleChannel('App Notification')}
                        className="w-4 h-4 rounded border-[#173D32]/30 text-[#173D32] focus:ring-[#173D32] cursor-pointer"
                      />
                      <span>App Notification</span>
                    </span>
                    <span className="text-[10px] text-teal-800 font-semibold bg-teal-100 px-1.5 py-0.2 rounded">
                      In-App Ready
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="flex items-center gap-2 font-semibold text-[#173D32]">
                      <input
                        type="checkbox"
                        checked={channels.includes('SMS')}
                        onChange={() => toggleChannel('SMS')}
                        className="w-4 h-4 rounded border-[#173D32]/30 text-[#173D32] focus:ring-[#173D32] cursor-pointer"
                      />
                      <span>SMS Broadcast</span>
                    </span>
                    <span className="text-[10px] text-amber-900 font-semibold bg-amber-100 px-1.5 py-0.2 rounded">
                      Gateway Unconfigured
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <span className="flex items-center gap-2 font-semibold text-[#173D32]">
                      <input
                        type="checkbox"
                        checked={channels.includes('IVRS Voice Call')}
                        onChange={() => toggleChannel('IVRS Voice Call')}
                        className="w-4 h-4 rounded border-[#173D32]/30 text-[#173D32] focus:ring-[#173D32] cursor-pointer"
                      />
                      <span>IVRS Voice Call</span>
                    </span>
                    <span className="text-[10px] text-amber-900 font-semibold bg-amber-100 px-1.5 py-0.2 rounded">
                      Telephony Unconfigured
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 4. Message Composition */}
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase font-extrabold text-[#173D32] tracking-wider block mb-1">
                  4. Advisory Headline / Title:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Clear headline indicating hazard and corridor"
                  className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#173D32]/20 text-xs sm:text-sm font-bold text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-1 focus:ring-[#173D32]"
                />
              </div>

              <div>
                <label className="text-xs uppercase font-extrabold text-[#173D32] tracking-wider block mb-1">
                  Hazard Description & Geotechnical Telemetry:
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe slope movement, moisture percentage, weather conditions..."
                  className="w-full p-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-1 focus:ring-[#173D32] resize-none"
                />
              </div>

              <div>
                <label className="text-xs uppercase font-extrabold text-[#173D32] tracking-wider block mb-1">
                  Recommended Public Advisory & Routing Directive:
                </label>
                <textarea
                  rows={2}
                  value={advisory}
                  onChange={(e) => setAdvisory(e.target.value)}
                  placeholder="Clear directive: Evacuate, avoid transit, hold at checkpoint, follow police..."
                  className="w-full p-3 rounded-xl bg-white border border-[#173D32]/20 text-xs text-[#173D32] placeholder:text-[#173D32]/40 focus:outline-none focus:ring-1 focus:ring-[#173D32] resize-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Previews (SMS, Push, IVRS, Local Language) (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Local Language Preview Selector */}
            <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-extrabold text-[#173D32] tracking-wider">
                  🌐 Local Language Preview
                </span>
                <span className="text-[10px] text-[#173D32]/60 font-semibold">Northeast Vernacular</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {(['Assamese', 'Hindi', 'Bengali', 'Nagamese', 'English'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLanguage(lang)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeLanguage === lang
                        ? 'bg-[#173D32] text-[#F6F4EC] shadow-2xs'
                        : 'bg-white text-[#173D32]/70 hover:bg-[#173D32]/10 border border-[#173D32]/10'
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

              <div className="p-3 bg-white rounded-xl border border-[#173D32]/15 text-xs text-[#173D32]/90 leading-relaxed font-sans min-h-[90px]">
                {localizedPreviewText}
              </div>
            </div>

            {/* Message Preview Before Approval */}
            <div className="p-4 rounded-2xl bg-[#F6F4EC] border border-[#173D32]/10">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs uppercase font-extrabold text-[#173D32] tracking-wider">
                  📱 Broadcast Preview
                </span>
                {/* Format switcher */}
                <div className="flex rounded-lg bg-white border border-[#173D32]/15 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('push')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      previewTab === 'push'
                        ? 'bg-[#173D32] text-white'
                        : 'text-[#173D32]/70 hover:text-[#173D32]'
                    }`}
                  >
                    Push
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('sms')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      previewTab === 'sms'
                        ? 'bg-[#173D32] text-white'
                        : 'text-[#173D32]/70 hover:text-[#173D32]'
                    }`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('ivrs')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      previewTab === 'ivrs'
                        ? 'bg-[#173D32] text-white'
                        : 'text-[#173D32]/70 hover:text-[#173D32]'
                    }`}
                  >
                    IVRS
                  </button>
                </div>
              </div>

              {/* View 1: Push Notification preview */}
              {previewTab === 'push' && (
                <div className="p-3.5 rounded-xl bg-white border border-[#173D32]/15 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-[#173D32] text-white flex items-center justify-center text-[10px] font-bold">
                        T
                      </span>
                      <span className="text-[11px] font-extrabold text-[#173D32]">Terra360 Emergency</span>
                    </div>
                    <span className="text-[10px] text-[#173D32]/50">now</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <StatusBadge status={severity} size="xs" />
                      <span className="text-xs font-bold text-[#173D32] truncate">{title}</span>
                    </div>
                    <p className="text-[11px] text-[#173D32]/80 leading-snug line-clamp-2">
                      {advisory}
                    </p>
                  </div>
                </div>
              )}

              {/* View 2: SMS text preview */}
              {previewTab === 'sms' && (
                <div className="p-3.5 rounded-xl bg-white border border-[#173D32]/15 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-[#173D32]/60 pb-1 border-b border-[#173D32]/8 font-mono">
                    <span>Sender: [GOV-TERRA360]</span>
                    <span>DLT Reg # 140226</span>
                  </div>
                  <p className="text-xs font-mono text-[#173D32]/90 leading-relaxed bg-[#FAF8F2] p-2 rounded-lg border border-[#173D32]/10">
                    TERRA360 [{severity.toUpperCase()} ALERT]: {title}. Location: {targetLocation}.{' '}
                    {advisory}. Helplines: 1077.
                  </p>
                  <div className="text-[10px] text-[#173D32]/60 flex items-center justify-between">
                    <span>Target: {audiences.join(', ')}</span>
                    <span>Estimated: 1 SMS Part</span>
                  </div>
                </div>
              )}

              {/* View 3: IVRS Voice Call preview */}
              {previewTab === 'ivrs' && (
                <div className="p-3.5 rounded-xl bg-white border border-[#173D32]/15 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200">
                    <span className="flex items-center gap-1.5">
                      <span className="animate-pulse">📞</span>
                      <span>IVRS Vernacular Text-to-Speech Engine</span>
                    </span>
                    <span className="text-[10px] font-mono">0:24s Script</span>
                  </div>
                  <div className="text-xs text-[#173D32]/85 italic bg-[#FAF8F2] p-2.5 rounded-lg border border-[#173D32]/10">
                    &quot;[Alert tone] This is an automated disaster bulletin from Terra360 and State Emergency Operations Center. {localizedPreviewText} Press 1 to repeat this advisory, press 9 to connect to district emergency desk.&quot;
                  </div>
                </div>
              )}
            </div>

            {/* Review and Approval Button */}
            <div className="p-4 rounded-2xl bg-[#DCE8D4]/40 border border-[#173D32]/15 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#173D32]">
                <span>🛡️</span>
                <span>Officer Authorization Checkpoint</span>
              </div>
              <p className="text-[11px] text-[#173D32]/75 leading-relaxed">
                Review alert summary, targeted populations, and channel restrictions before confirmation.
              </p>

              <button
                type="button"
                onClick={handleReviewClick}
                className="w-full h-11 rounded-2xl bg-[#173D32] hover:bg-[#1a4437] text-[#F6F4EC] text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔍</span>
                <span>Review & Approve Alert</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
