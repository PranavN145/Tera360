"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import PortalLayout from "@/components/portal/PortalLayout";
import { useApp } from "@/context/AppContext";
import { FamilyContact, User } from "@/types/auth";
import {
  getVillagesByState,
  getVillageByName,
  getUniqueStates,
} from "@/data/villages";

type SupportedLanguage = "en" | "as" | "bn" | "hi" | "mni" | "lus";

const LANGUAGES: Array<{ code: SupportedLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "as", label: "Assamese (অসমীয়া)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "mni", label: "Manipuri (মৈতৈলোন্)" },
  { code: "lus", label: "Mizo (Lushai)" },
];

const RELATIONSHIPS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Relative",
  "Neighbor",
  "Other",
];

function isSupportedLanguage(val?: string): val is SupportedLanguage {
  return (
    val === "en" ||
    val === "as" ||
    val === "bn" ||
    val === "hi" ||
    val === "mni" ||
    val === "lus"
  );
}

interface ProfileFormProps {
  currentUser: User | null;
}

function CitizenProfileForm({ currentUser }: ProfileFormProps) {
  const { updateProfile, addToast } = useApp();

  // Basic Details State initialized directly from currentUser
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [language, setLanguage] = useState<SupportedLanguage>(
    isSupportedLanguage(currentUser?.language) ? currentUser.language : "en"
  );

  // Village Information State
  const [state, setState] = useState(currentUser?.village?.state || "Nagaland");
  const [district, setDistrict] = useState(currentUser?.village?.district || "Kohima");
  const [villageName, setVillageName] = useState(
    currentUser?.village?.villageName || "Phesama"
  );
  const [isCustomVillage, setIsCustomVillage] = useState(false);

  // Family Contacts State
  const [familyContacts, setFamilyContacts] = useState<FamilyContact[]>(
    currentUser?.familyContacts || []
  );
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelationship, setNewContactRelationship] = useState("Spouse");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRelationship, setEditRelationship] = useState("Spouse");
  const [contactError, setContactError] = useState<string | null>(null);

  // Alert Preferences State
  const [alertPreferences, setAlertPreferences] = useState({
    ivrs: currentUser?.alertPreferences?.ivrs ?? true,
    sms: currentUser?.alertPreferences?.sms ?? true,
    app: currentUser?.alertPreferences?.app ?? true,
  });

  // Submission & UI States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Available villages for current state
  const availableVillages = useMemo(() => {
    return getVillagesByState(state);
  }, [state]);

  const uniqueStates = useMemo(() => {
    return getUniqueStates();
  }, []);

  // When state changes, update district & village if pre-configured
  const handleStateChange = (selectedState: string) => {
    setState(selectedState);
    const matching = getVillagesByState(selectedState);
    if (matching.length > 0) {
      setDistrict(matching[0].district);
      setVillageName(matching[0].name);
      setIsCustomVillage(false);
    } else {
      setIsCustomVillage(true);
    }
  };

  // When a verified village is picked
  const handleVillageSelect = (pickedName: string) => {
    if (pickedName === "__custom__") {
      setIsCustomVillage(true);
      return;
    }
    setIsCustomVillage(false);
    setVillageName(pickedName);
    const matching = availableVillages.find((v) => v.name === pickedName);
    if (matching) {
      setDistrict(matching.district);
    }
  };

  // Matched verified village object (if any)
  const matchedVillage = useMemo(() => {
    return getVillageByName(villageName);
  }, [villageName]);

  // Family Contact Handlers
  const validatePhoneNumber = (raw: string): boolean => {
    const clean = raw.trim();
    return clean.length >= 7 && clean.length <= 25 && /^[+0-9\s\-()]+$/.test(clean);
  };

  const handleAddContact = () => {
    setContactError(null);
    if (!newContactName.trim()) {
      setContactError("Please enter a family member name.");
      return;
    }
    if (!validatePhoneNumber(newContactPhone)) {
      setContactError("Please enter a valid phone number (digits and optional + prefix).");
      return;
    }
    if (familyContacts.length >= 10) {
      setContactError("Maximum 10 emergency contacts permitted.");
      return;
    }

    const newContact: FamilyContact = {
      id: `fc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRelationship,
    };

    setFamilyContacts((prev) => [...prev, newContact]);
    setNewContactName("");
    setNewContactPhone("");
    setNewContactRelationship("Spouse");
  };

  const handleRemoveContact = (idToRemove?: string) => {
    if (!idToRemove) return;
    setFamilyContacts((prev) => prev.filter((c) => (c.id || c._id) !== idToRemove));
    if (editingContactId === idToRemove) {
      setEditingContactId(null);
    }
  };

  const startEditContact = (contact: FamilyContact) => {
    setEditingContactId(contact.id || contact._id || null);
    setEditName(contact.name);
    setEditPhone(contact.phone);
    setEditRelationship(contact.relationship || "Spouse");
    setContactError(null);
  };

  const handleSaveEditedContact = () => {
    if (!editName.trim()) {
      setContactError("Contact name cannot be empty.");
      return;
    }
    if (!validatePhoneNumber(editPhone)) {
      setContactError("Please enter a valid phone number.");
      return;
    }

    setFamilyContacts((prev) =>
      prev.map((c) =>
        (c.id || c._id) === editingContactId
          ? {
              ...c,
              name: editName.trim(),
              phone: editPhone.trim(),
              relationship: editRelationship,
            }
          : c
      )
    );
    setEditingContactId(null);
    setContactError(null);
  };

  // Save full profile to backend
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        language,
        village: {
          state: state.trim(),
          district: district.trim(),
          villageName: villageName.trim(),
        },
        familyContacts,
        alertPreferences,
      });

      setSaveSuccessMsg("Your citizen profile and village preferences have been saved.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update citizen profile";
      setSaveErrorMsg(msg);
      addToast({
        title: "Update Failed",
        description: msg,
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveProfile} className="space-y-6 max-w-4xl pb-10">
      {/* Status Banners */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✓</span>
            <span className="font-bold">{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-900 border border-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="font-bold">{saveErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveErrorMsg(null)}
            className="text-red-700 hover:text-red-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Summary Card */}
      <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#173D32]/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#173D32] text-[#F6F4EC] font-black text-xl flex items-center justify-center shadow-xs">
              {currentUser?.name
                ? currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "CZ"}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#173D32]">
                {currentUser?.name || "Citizen Resident"}
              </h2>
              <p className="text-xs text-[#173D32]/70 mt-0.5">{currentUser?.email}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-xs font-bold uppercase tracking-wider">
                  Citizen Community
                </span>
                {currentUser?.emailVerified ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    Email Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                    Unverified Email
                  </span>
                )}
                {villageName && (
                  <span className="px-2 py-0.5 rounded-full bg-white text-[#173D32] text-xs font-bold border border-[#173D32]/15">
                    📍 {villageName}, {state}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/account"
            className="px-4 py-2 rounded-xl bg-white border border-[#173D32]/20 hover:bg-[#F6F4EC] text-[#173D32] text-xs font-bold transition-colors text-center shrink-0 shadow-2xs"
          >
            Security & Credentials →
          </Link>
        </div>

        {/* Section 1: Personal & Settlement Details */}
        <div className="pt-6 space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
            <span>👤</span>
            <span>Personal & Village Settlement Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#173D32] font-bold uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
              />
            </div>

            <div>
              <label className="block text-[#173D32] font-bold uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
              />
            </div>

            <div>
              <label className="block text-[#173D32] font-bold uppercase tracking-wider mb-1">
                Preferred Alert Language *
              </label>
              <select
                value={language}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isSupportedLanguage(val)) {
                    setLanguage(val);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D] cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Village Cascading Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div>
              <label className="block text-[#173D32] font-bold uppercase tracking-wider mb-1">
                State / Hill Territory *
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D] cursor-pointer"
              >
                {uniqueStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Manipur">Manipur</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Tripura">Tripura</option>
              </select>
            </div>

            <div>
              <label className="block text-[#173D32] font-bold uppercase tracking-wider mb-1">
                Hill District *
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Kohima, Dima Hasao"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
              />
            </div>

            <div>
              <label className="block text-[#173D32] font-bold uppercase tracking-wider mb-1">
                Village / Locality *
              </label>
              {!isCustomVillage && availableVillages.length > 0 ? (
                <select
                  value={villageName}
                  onChange={(e) => handleVillageSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D] cursor-pointer"
                >
                  {availableVillages.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} ({v.currentRiskLevel} Risk)
                    </option>
                  ))}
                  <option value="__custom__">-- Other (Enter Manually) --</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    placeholder="Village Name"
                    required
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
                  />
                  {availableVillages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomVillage(false);
                        setVillageName(availableVillages[0].name);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-xl border border-[#173D32]/20 hover:bg-white cursor-pointer"
                      title="Pick from verified directory"
                    >
                      List
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Verified Village Summary Pill if matched */}
          {matchedVillage && (
            <div className="mt-3 p-3.5 rounded-2xl bg-[#DCE8D4]/40 border border-[#173D32]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-extrabold text-[#173D32]">
                  Verified Settlement: {matchedVillage.name} ({matchedVillage.district})
                </span>
                <p className="text-[11px] text-[#173D32]/75 mt-0.5">
                  Designated Shelter: <strong>{matchedVillage.safeShelter.name}</strong> ({matchedVillage.safeShelter.distanceKm} km) · Population: ~{matchedVillage.populationEstimate}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#173D32]/70">Local Elder:</span>
                <a
                  href={`tel:${matchedVillage.contactPerson.phone}`}
                  className="font-bold text-[#173D32] hover:underline"
                >
                  {matchedVillage.contactPerson.name} ({matchedVillage.contactPerson.phone})
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Family Emergency Contacts */}
      <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#173D32]/10">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
              <span>👨‍👩‍👧‍👦</span>
              <span>Family Emergency Contacts</span>
            </h3>
            <p className="text-xs text-[#173D32]/70 mt-0.5">
              Saved family members will be notified automatically during urgent evacuation advisories.
            </p>
          </div>
          <span className="text-xs font-bold text-[#173D32]/60 self-start sm:self-center">
            {familyContacts.length} / 10 Contacts
          </span>
        </div>

        {contactError && (
          <div className="p-3 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs">
            {contactError}
          </div>
        )}

        {/* Existing Contacts List */}
        {familyContacts.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-[#173D32]/20 rounded-2xl bg-white/60">
            <span className="text-2xl block mb-1">📞</span>
            <p className="text-xs font-bold text-[#173D32]">No family emergency contacts added yet</p>
            <p className="text-[11px] text-[#173D32]/60 mt-0.5">
              Add phone numbers below so your family receives evacuation alerts.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {familyContacts.map((contact, index) => {
              const cId = contact.id || contact._id || String(index);
              const isEditing = editingContactId === cId;

              return (
                <div
                  key={cId}
                  className="p-3.5 rounded-2xl bg-white border border-[#173D32]/12 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Contact Name"
                        className="px-3 py-1.5 rounded-lg border border-[#173D32]/20 text-xs text-[#173D32]"
                      />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="px-3 py-1.5 rounded-lg border border-[#173D32]/20 text-xs text-[#173D32]"
                      />
                      <select
                        value={editRelationship}
                        onChange={(e) => setEditRelationship(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-[#173D32]/20 text-xs text-[#173D32]"
                      >
                        {RELATIONSHIPS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#DCE8D4] text-[#173D32] font-black flex items-center justify-center shrink-0">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#173D32]">{contact.name}</span>
                          {contact.relationship && (
                            <span className="px-2 py-0.5 rounded-md bg-[#FAF8F2] border border-[#173D32]/10 text-[10px] font-bold text-[#173D32]/80">
                              {contact.relationship}
                            </span>
                          )}
                        </div>
                        <a
                          href={`tel:${contact.phone}`}
                          className="font-mono text-xs text-[#173D32]/75 hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveEditedContact}
                          className="px-3 py-1 rounded-lg bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingContactId(null)}
                          className="px-3 py-1 rounded-lg border border-[#173D32]/20 text-[#173D32] text-xs hover:bg-[#F6F4EC] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditContact(contact)}
                          className="px-2.5 py-1 rounded-lg border border-[#173D32]/20 text-[#173D32] text-xs font-semibold hover:bg-[#F6F4EC] cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(cId)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 cursor-pointer"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Contact Form */}
        {familyContacts.length < 10 && (
          <div className="pt-3 border-t border-[#173D32]/10">
            <span className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-2">
              + Add Another Family Contact
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
              <input
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Full Name"
                className="px-3 py-2 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
              />
              <input
                type="tel"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="px-3 py-2 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D]"
              />
              <select
                value={newContactRelationship}
                onChange={(e) => setNewContactRelationship(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-2 focus:outline-[#D6A65D] cursor-pointer"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddContact}
                className="py-2 px-3 rounded-xl bg-[#173D32] text-[#F6F4EC] font-bold hover:bg-[#1a4437] transition-colors cursor-pointer"
              >
                Add Contact
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Alert Delivery Preferences */}
      <div className="p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-[#173D32]/10">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
            <span>🔔</span>
            <span>Emergency Alert Delivery Channels</span>
          </h3>
          <p className="text-xs text-[#173D32]/70 mt-0.5">
            Select which channels should be used to notify you when landslide hazards affect your village.
          </p>
        </div>

        <div className="space-y-3">
          {/* Preference 1: IVRS Voice Calls */}
          <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-extrabold text-[#173D32] text-xs block">
                IVRS Automated Voice Calls (High Priority)
              </span>
              <p className="text-[11px] text-[#173D32]/75">
                Receive priority spoken alerts in your preferred language during Critical or Warning triggers. Works on basic feature phones.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={alertPreferences.ivrs}
              onClick={() =>
                setAlertPreferences((prev) => ({ ...prev, ivrs: !prev.ivrs }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                alertPreferences.ivrs ? "bg-[#173D32]" : "bg-neutral-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  alertPreferences.ivrs ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Preference 2: SMS Alerts */}
          <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-extrabold text-[#173D32] text-xs block">
                SMS Text Bulletins
              </span>
              <p className="text-[11px] text-[#173D32]/75">
                Receive concise text messages with road blockage stretch info and nearest shelter guidance.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={alertPreferences.sms}
              onClick={() =>
                setAlertPreferences((prev) => ({ ...prev, sms: !prev.sms }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                alertPreferences.sms ? "bg-[#173D32]" : "bg-neutral-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  alertPreferences.sms ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Preference 3: App Notifications */}
          <div className="p-4 rounded-2xl bg-white border border-[#173D32]/10 shadow-2xs flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-extrabold text-[#173D32] text-xs block">
                App Notifications & Audio Cues
              </span>
              <p className="text-[11px] text-[#173D32]/75">
                Receive live browser notifications, sound sirens, and visual risk banners inside Terra360.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={alertPreferences.app}
              onClick={() =>
                setAlertPreferences((prev) => ({ ...prev, app: !prev.app }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                alertPreferences.app ? "bg-[#173D32]" : "bg-neutral-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  alertPreferences.app ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          href="/citizen/home"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#173D32]/25 text-[#173D32] text-xs font-bold hover:bg-[#F6F4EC] transition-colors text-center"
        >
          ← Return to Dashboard
        </Link>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#173D32] text-[#F6F4EC] text-xs font-extrabold hover:bg-[#1a4437] transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <svg
                className="animate-spin h-3.5 w-3.5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Saving Profile...</span>
            </>
          ) : (
            <span>Save Profile Changes ✓</span>
          )}
        </button>
      </div>
    </form>
  );
}

export default function CitizenProfilePage() {
  const { user } = useApp();

  return (
    <PortalLayout
      allowedRoles={["citizen"]}
      title="Citizen Profile & Village Settings"
      subtitle="Manage your settlement location, emergency contacts, alert delivery preferences, and offline data."
    >
      <CitizenProfileForm key={user?._id || "anon"} currentUser={user} />
    </PortalLayout>
  );
}
