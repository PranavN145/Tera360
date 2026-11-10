"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalSectionCard from "@/components/portal/PortalSectionCard";
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

  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [language, setLanguage] = useState<SupportedLanguage>(
    isSupportedLanguage(currentUser?.language) ? currentUser.language : "en"
  );

  const [state, setState] = useState(currentUser?.village?.state || "Nagaland");
  const [district, setDistrict] = useState(currentUser?.village?.district || "Kohima");
  const [villageName, setVillageName] = useState(
    currentUser?.village?.villageName || "Phesama"
  );
  const [isCustomVillage, setIsCustomVillage] = useState(false);

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

  const [alertPreferences, setAlertPreferences] = useState({
    ivrs: currentUser?.alertPreferences?.ivrs ?? true,
    sms: currentUser?.alertPreferences?.sms ?? true,
    app: currentUser?.alertPreferences?.app ?? true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const availableVillages = useMemo(() => getVillagesByState(state), [state]);
  const uniqueStates = useMemo(() => getUniqueStates(), []);

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

  const matchedVillage = useMemo(() => getVillageByName(villageName), [villageName]);

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

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CZ";

  return (
    <form onSubmit={handleSaveProfile} className="space-y-6 w-full pb-8">
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span className="font-bold">{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            aria-label="Dismiss saved message"
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-900 border border-red-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
            <span className="font-bold">{saveErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveErrorMsg(null)}
            aria-label="Dismiss error message"
            className="text-red-700 hover:text-red-900 cursor-pointer p-0.5"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Top Identity Summary Card with Mountain Crest */}
      <div className="relative overflow-hidden p-6 sm:p-8 bg-[#FAF8F2] rounded-3xl border border-[#173D32]/12 shadow-xs">
        <svg
          className="pointer-events-none select-none absolute -bottom-4 -right-6 w-64 h-28 text-[#173D32]/[0.04]"
          viewBox="0 0 260 110"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M0 110 L58 46 L108 82 L164 24 L218 76 L260 44 L260 110 Z" />
        </svg>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#173D32]/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#173D32] text-[#F6F4EC] font-black text-xl flex items-center justify-center shadow-xs shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#173D32]">
                {currentUser?.name || "Citizen Resident"}
              </h2>
              <p className="text-xs text-[#173D32]/70 mt-0.5">{currentUser?.email}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCE8D4] text-[#173D32] text-[11px] font-bold uppercase tracking-wider">
                  Citizen Community
                </span>
                {currentUser?.emailVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                    Email Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                    Unverified Email
                  </span>
                )}
                {villageName && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-[#173D32] text-[11px] font-bold border border-[#173D32]/12 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#D6A65D]" aria-hidden="true" />
                    <span>
                      {villageName}, {state}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/account?tab=security"
            className="px-4 py-2 rounded-full bg-white border border-[#173D32]/15 hover:bg-[#F6F4EC] text-[#173D32] text-xs font-bold transition-colors inline-flex items-center gap-1.5 self-start sm:self-center shrink-0"
          >
            <span>Security &amp; Credentials</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Section 1: Personal & Settlement Details */}
        <div className="relative z-10 pt-6 space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#173D32] flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-[#173D32]" aria-hidden="true" />
            <span>Personal &amp; Village Settlement Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label
                htmlFor="cp-name"
                className="block text-[#173D32] font-bold uppercase tracking-wider mb-1.5"
              >
                Full Name *
              </label>
              <input
                id="cp-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
              />
            </div>

            <div>
              <label
                htmlFor="cp-phone"
                className="block text-[#173D32] font-bold uppercase tracking-wider mb-1.5"
              >
                Phone Number
              </label>
              <input
                id="cp-phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
              />
            </div>

            <div>
              <label
                htmlFor="cp-language"
                className="block text-[#173D32] font-bold uppercase tracking-wider mb-1.5"
              >
                Preferred Alert Language *
              </label>
              <select
                id="cp-language"
                name="language"
                value={language}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isSupportedLanguage(val)) {
                    setLanguage(val);
                  }
                }}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
            <div>
              <label
                htmlFor="cp-state"
                className="block text-[#173D32] font-bold uppercase tracking-wider mb-1.5"
              >
                State / Hill Territory *
              </label>
              <select
                id="cp-state"
                name="villageState"
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] cursor-pointer"
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
              <label
                htmlFor="cp-district"
                className="block text-[#173D32] font-bold uppercase tracking-wider mb-1.5"
              >
                Hill District *
              </label>
              <input
                id="cp-district"
                name="villageDistrict"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Kohima, Dima Hasao"
                required
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
              />
            </div>

            <div>
              <label
                htmlFor="cp-village"
                className="block text-[#173D32] font-bold uppercase tracking-wider mb-1.5"
              >
                Village / Locality *
              </label>
              {!isCustomVillage && availableVillages.length > 0 ? (
                <select
                  id="cp-village"
                  name="villageName"
                  value={villageName}
                  onChange={(e) => handleVillageSelect(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32] cursor-pointer"
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
                    id="cp-village"
                    name="villageName"
                    type="text"
                    value={villageName}
                    onChange={(e) => setVillageName(e.target.value)}
                    placeholder="Village Name"
                    required
                    className="flex-1 h-11 px-3.5 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] focus:outline-none focus:ring-2 focus:ring-[#173D32]"
                  />
                  {availableVillages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomVillage(false);
                        setVillageName(availableVillages[0].name);
                      }}
                      className="px-3 rounded-xl border border-[#173D32]/20 text-xs font-bold hover:bg-white cursor-pointer"
                    >
                      List
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {matchedVillage && (
            <div className="mt-2 p-3.5 rounded-2xl bg-[#DCE8D4]/45 border border-[#173D32]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-extrabold text-[#173D32]">
                  Verified Settlement: {matchedVillage.name} ({matchedVillage.district})
                </span>
                <p className="text-[11px] text-[#173D32]/75 mt-0.5">
                  Designated Shelter: <strong>{matchedVillage.safeShelter.name}</strong> (
                  {matchedVillage.safeShelter.distanceKm} km) · Pop. ~{matchedVillage.populationEstimate}
                </p>
              </div>
              <a
                href={`tel:${matchedVillage.contactPerson.phone}`}
                className="font-bold text-[#173D32] hover:underline shrink-0 inline-flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {matchedVillage.contactPerson.name} ({matchedVillage.contactPerson.phone})
                </span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Family Emergency Contacts */}
      <PortalSectionCard
        title="Family Emergency Contacts"
        subtitle="Saved family members receive automated evacuation broadcasts"
        icon={<Users className="w-4 h-4 text-[#173D32]" aria-hidden="true" />}
        actions={
          <span className="text-xs font-bold text-[#173D32]/70">
            {familyContacts.length} / 10 Contacts
          </span>
        }
      >
        {contactError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs">
            {contactError}
          </div>
        )}

        {familyContacts.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-[#173D32]/20 rounded-2xl bg-white/60 mb-4">
            <Phone className="w-6 h-6 text-[#173D32]/60 mx-auto mb-1.5" aria-hidden="true" />
            <p className="text-xs font-bold text-[#173D32]">No family emergency contacts added yet</p>
            <p className="text-[11px] text-[#173D32]/65 mt-0.5">
              Add family phone numbers below to notify household members during alerts.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 mb-4">
            {familyContacts.map((contact, index) => {
              const cId = contact.id || contact._id || String(index);
              const isEditing = editingContactId === cId;

              return (
                <div
                  key={cId}
                  className="p-3.5 rounded-2xl bg-white border border-[#173D32]/12 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        id={`cp-edit-name-${cId}`}
                        name="editContactName"
                        type="text"
                        aria-label="Edit contact name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Contact Name"
                        className="px-3 py-1.5 rounded-lg border border-[#173D32]/20 text-xs text-[#173D32]"
                      />
                      <input
                        id={`cp-edit-phone-${cId}`}
                        name="editContactPhone"
                        type="tel"
                        aria-label="Edit contact phone"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="px-3 py-1.5 rounded-lg border border-[#173D32]/20 text-xs text-[#173D32]"
                      />
                      <select
                        id={`cp-edit-rel-${cId}`}
                        name="editContactRelationship"
                        aria-label="Edit contact relationship"
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
                          <span className="font-bold text-[#173D32]">{contact.name}</span>
                          {contact.relationship && (
                            <span className="px-2 py-0.5 rounded-full bg-[#FAF8F2] border border-[#173D32]/10 text-[10px] font-bold text-[#173D32]/80">
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

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveEditedContact}
                          className="px-3 py-1 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingContactId(null)}
                          className="px-3 py-1 rounded-full border border-[#173D32]/20 text-[#173D32] text-xs hover:bg-[#F6F4EC] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditContact(contact)}
                          className="px-3 py-1 rounded-full border border-[#173D32]/15 text-[#173D32] text-xs font-semibold hover:bg-[#F6F4EC] cursor-pointer inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(cId)}
                          className="px-3 py-1 rounded-full border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {familyContacts.length < 10 && (
          <div className="pt-3 border-t border-[#173D32]/10">
            <span className="block text-xs font-bold text-[#173D32] uppercase tracking-wider mb-2">
              Add Family Contact
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
              <input
                id="cp-new-contact-name"
                name="newContactName"
                type="text"
                aria-label="New family contact name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Full Name"
                className="h-10 px-3 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32]"
              />
              <input
                id="cp-new-contact-phone"
                name="newContactPhone"
                type="tel"
                aria-label="New family contact phone"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-10 px-3 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32]"
              />
              <select
                id="cp-new-contact-rel"
                name="newContactRelationship"
                aria-label="New family contact relationship"
                value={newContactRelationship}
                onChange={(e) => setNewContactRelationship(e.target.value)}
                className="h-10 px-3 rounded-xl bg-white border border-[#173D32]/15 text-[#173D32] cursor-pointer"
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
                className="h-10 px-4 rounded-full bg-[#173D32] text-[#F6F4EC] font-bold hover:bg-[#1a4437] transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Contact</span>
              </button>
            </div>
          </div>
        )}
      </PortalSectionCard>

      {/* Section 3: Alert Delivery Channels */}
      <PortalSectionCard
        title="Emergency Alert Delivery Channels"
        subtitle="Select notification channels used during Critical or Warning triggers"
        icon={<Bell className="w-4 h-4 text-[#173D32]" aria-hidden="true" />}
      >
        <div className="space-y-3">
          {[
            {
              key: "ivrs" as const,
              title: "IVRS Automated Voice Calls (High Priority)",
              desc: "Priority spoken alerts in your preferred language. Works on feature phones.",
            },
            {
              key: "sms" as const,
              title: "SMS Text Bulletins",
              desc: "Concise text advisories with road blockage stretches and nearest safe shelter.",
            },
            {
              key: "app" as const,
              title: "App Notifications & Audio Cues",
              desc: "Live browser alerts, warning banners, and speech read-aloud inside Terra360.",
            },
          ].map((item) => {
            const checked = alertPreferences[item.key];
            return (
              <div
                key={item.key}
                className="p-4 rounded-2xl bg-white border border-[#173D32]/10 flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-[#173D32] text-xs block">{item.title}</span>
                  <p className="text-[11px] text-[#173D32]/75">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label={item.title}
                  aria-checked={checked}
                  onClick={() =>
                    setAlertPreferences((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    checked ? "bg-[#173D32]" : "bg-[#173D32]/25"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      checked ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </PortalSectionCard>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <Link
          href="/citizen/home"
          className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#173D32]/20 text-[#173D32] text-xs font-bold hover:bg-white transition-colors text-center inline-flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Return to Dashboard</span>
        </Link>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-7 py-2.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <span>{isSaving ? "Saving Profile..." : "Save Profile Changes"}</span>
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

export default function CitizenProfilePage() {
  const { user } = useApp();

  return (
    <PortalLayout
      allowedRoles={["citizen", "driver", "admin"]}
      title="Citizen Profile & Village Settings"
      subtitle="Manage your registered settlement, family emergency circle, and disaster alert delivery preferences."
      headerActions={
        <Link
          href="/citizen/home"
          className="px-3.5 py-1.5 rounded-full bg-[#173D32] text-[#F6F4EC] text-xs font-bold hover:bg-[#1a4437] transition-all inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Home</span>
        </Link>
      }
    >
      <CitizenProfileForm key={user?._id || "anon"} currentUser={user} />
    </PortalLayout>
  );
}
