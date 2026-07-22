"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDays,
  createSignaturePackageId,
  formatPackageDate,
  getPackageDaysRemaining,
  getPackageStatusLabel,
  normalizePhoneNumber,
  signaturePackageCollection,
  signaturePackageDurations,
  signaturePackagePlans,
  toInputDateValue,
  type SignaturePackage,
  type SignaturePackagePeriod,
  type SignaturePackageStatus,
} from "@/lib/signaturePackages";

const today = new Date();
const initialPackageForm = {
  id: "",
  customerName: "",
  phoneNumber: "",
  planName: signaturePackagePlans[0].name as string,
  packagePeriod: "Monthly" as SignaturePackagePeriod,
  amount: String(signaturePackagePlans[0].monthlyPrice),
  startDate: toInputDateValue(today),
  expiryDate: toInputDateValue(addDays(today, 30)),
  status: "active" as SignaturePackageStatus,
};

function getPlanDescription(planName: string) {
  return signaturePackagePlans.find((plan) => plan.name === planName)?.description ?? "";
}

function getPlanPrice(planName: string, packagePeriod: SignaturePackagePeriod) {
  const plan = signaturePackagePlans.find((packagePlan) => packagePlan.name === planName);
  return packagePeriod === "Weekly" ? plan?.weeklyPrice ?? 0 : plan?.monthlyPrice ?? 0;
}

function getExpiryDate(startDate: string, packagePeriod: SignaturePackagePeriod) {
  return toInputDateValue(addDays(new Date(`${startDate}T00:00:00`), signaturePackageDurations[packagePeriod]));
}

function dateInputToTimestamp(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Timestamp.fromDate(date);
}

export default function AdminSignaturePackages() {
  const [packages, setPackages] = useState<SignaturePackage[]>([]);
  const [form, setForm] = useState(initialPackageForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!db) {
      return;
    }

    const packagesQuery = query(
      collection(db, signaturePackageCollection),
      orderBy("expiryDate", "asc"),
    );

    return onSnapshot(
      packagesQuery,
      (snapshot) => {
        setPackages(
          snapshot.docs.map((packageDocument) => ({
            id: packageDocument.id,
            ...(packageDocument.data() as Omit<SignaturePackage, "id">),
          })),
        );
      },
      (error) => setMessage(error.message),
    );
  }, []);

  const filteredPackages = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return packages;
    }

    return packages.filter((pkg) => {
      const searchable = `${pkg.packageId} ${pkg.customerName} ${pkg.phoneNumber} ${pkg.planName}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [packages, searchTerm]);

  const packageStats = useMemo(() => {
    const activePackages = packages.filter(
      (pkg) => getPackageStatusLabel(pkg) === "Active" || getPackageStatusLabel(pkg) === "Expiring soon",
    ).length;
    const expiringPackages = packages.filter((pkg) => {
      const days = getPackageDaysRemaining(pkg.expiryDate);
      return days !== null && days >= 0 && days <= 2;
    }).length;
    const packageValue = packages
      .filter((pkg) => pkg.status === "active")
      .reduce((sum, pkg) => sum + (pkg.amount ?? 0), 0);

    return {
      total: packages.length,
      active: activePackages,
      expiring: expiringPackages,
      packageValue,
    };
  }, [packages]);

  const resetForm = () => {
    setForm(initialPackageForm);
  };

  const updatePlan = (planName: string) => {
    setForm((current) => ({
      ...current,
      planName,
      amount: String(getPlanPrice(planName, current.packagePeriod)),
      expiryDate: getExpiryDate(current.startDate, current.packagePeriod),
    }));
  };

  const updatePackagePeriod = (packagePeriod: SignaturePackagePeriod) => {
    setForm((current) => ({
      ...current,
      packagePeriod,
      amount: String(getPlanPrice(current.planName, packagePeriod)),
      expiryDate: getExpiryDate(current.startDate, packagePeriod),
    }));
  };

  const submitPackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!db) {
      setMessage("Firebase is not configured.");
      return;
    }

    const phoneNumber = normalizePhoneNumber(form.phoneNumber);
    const amount = Number(form.amount);

    if (phoneNumber.length !== 10) {
      setMessage("Enter a valid 10 digit customer mobile number.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid package amount.");
      return;
    }

    const packageId = form.id
      ? packages.find((pkg) => pkg.id === form.id)?.packageId ?? form.id
      : createSignaturePackageId(phoneNumber, form.planName, form.packagePeriod);
    const packageReference = doc(db, signaturePackageCollection, form.id || packageId);
    const payload = {
      packageId,
      customerName: form.customerName.trim(),
      phoneNumber,
      planName: form.planName,
      planDescription: getPlanDescription(form.planName),
      packagePeriod: form.packagePeriod,
      packageDurationDays: signaturePackageDurations[form.packagePeriod],
      amount,
      status: form.status,
      startDate: dateInputToTimestamp(form.startDate),
      expiryDate: dateInputToTimestamp(form.expiryDate),
      paymentMode: "offline",
      paymentStatus: "offline_paid",
      updatedAt: serverTimestamp(),
    };

    if (form.id) {
      await updateDoc(packageReference, payload);
      setMessage("Signature package updated.");
    } else {
      await setDoc(packageReference, {
        ...payload,
        notificationToken: null,
        notificationTokens: [],
        lastExpiryNotificationAt: null,
        createdAt: serverTimestamp(),
      });
      setMessage("Offline signature package added.");
    }

    resetForm();
  };

  const editPackage = (pkg: SignaturePackage) => {
    setForm({
      id: pkg.id,
      customerName: pkg.customerName,
      phoneNumber: pkg.phoneNumber,
      planName: pkg.planName,
      packagePeriod: pkg.packagePeriod ?? "Monthly",
      amount: String(pkg.amount),
      startDate: pkg.startDate ? toInputDateValue(pkg.startDate.toDate()) : toInputDateValue(today),
      expiryDate: pkg.expiryDate ? toInputDateValue(pkg.expiryDate.toDate()) : toInputDateValue(addDays(today, 30)),
      status: pkg.status,
    });
  };

  const updatePackageStatus = async (pkg: SignaturePackage, status: SignaturePackageStatus) => {
    if (!db) {
      return;
    }

    await updateDoc(doc(db, signaturePackageCollection, pkg.id), {
      status,
      updatedAt: serverTimestamp(),
    });
    setMessage(`${pkg.customerName}'s package marked ${status}.`);
  };

  const deletePackage = async (pkg: SignaturePackage) => {
    if (!db) {
      return;
    }

    await deleteDoc(doc(db, signaturePackageCollection, pkg.id));
    setMessage(`${pkg.customerName}'s signature package deleted.`);
  };

  return (
    <div className="mt-8 grid gap-6">
      {message && (
        <div className="rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14] p-4 text-sm font-bold text-[#E9B44C]">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Packages", packageStats.total],
          ["Active Packages", packageStats.active],
          ["Expiring Soon", packageStats.expiring],
          ["Package Value", `Rs. ${packageStats.packageValue}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F97316]">
              {label}
            </p>
            <p className="mt-3 text-2xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={submitPackage} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
          <h2 className="text-2xl font-black text-white">
            {form.id ? "Edit Signature Package" : "Add Offline Signature Package"}
          </h2>
          <div className="mt-5 grid gap-4">
            <input
              required
              value={form.customerName}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerName: event.target.value }))
              }
              placeholder="Customer name"
              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
            />
            <input
              required
              inputMode="numeric"
              value={form.phoneNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
                }))
              }
              placeholder="Customer mobile number"
              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
            />
            <select
              value={form.planName}
              onChange={(event) => updatePlan(event.target.value)}
              className="h-12 rounded-lg border border-white/10 bg-black px-4 text-white outline-none"
            >
              {signaturePackagePlans.map((plan) => (
                <option key={plan.name} value={plan.name}>
                  {plan.name} - Weekly Rs. {plan.weeklyPrice} | Monthly Rs. {plan.monthlyPrice}
                </option>
              ))}
            </select>
            <select
              value={form.packagePeriod}
              onChange={(event) =>
                updatePackagePeriod(event.target.value as SignaturePackagePeriod)
              }
              className="h-12 rounded-lg border border-white/10 bg-black px-4 text-white outline-none"
            >
              <option value="Weekly">Weekly package</option>
              <option value="Monthly">Monthly package</option>
            </select>
            <input
              required
              min="1"
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
              placeholder="Package amount"
              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-zinc-200">
                Start date
                <input
                  required
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                      expiryDate: getExpiryDate(event.target.value, current.packagePeriod),
                    }))
                  }
                  className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-zinc-200">
                Expiry date
                <input
                  required
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, expiryDate: event.target.value }))
                  }
                  className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                />
              </label>
            </div>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as SignaturePackageStatus,
                }))
              }
              className="h-12 rounded-lg border border-white/10 bg-black px-4 text-white outline-none"
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              className="h-12 rounded-full bg-[#F97316] px-6 text-sm font-black text-white transition hover:bg-[#E9B44C] hover:text-black"
            >
              {form.id ? "Update Package" : "Add Package"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="h-12 rounded-full border border-white/15 px-6 text-sm font-black text-zinc-200"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="grid gap-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search package ID, customer, phone, or plan"
            className="h-12 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none placeholder:text-zinc-500"
          />

          {filteredPackages.map((pkg) => {
            const daysRemaining = getPackageDaysRemaining(pkg.expiryDate);
            const label = getPackageStatusLabel(pkg);

            return (
              <article key={pkg.id} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#E9B44C]">
                      {pkg.packageId}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-white">{pkg.customerName}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {pkg.phoneNumber} | {pkg.planName} | {pkg.packagePeriod ?? "Monthly"} | Rs. {pkg.amount}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      Start: {formatPackageDate(pkg.startDate)} | Expiry: {formatPackageDate(pkg.expiryDate)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#E9B44C]">
                      {daysRemaining === null
                        ? "No expiry date"
                        : daysRemaining < 0
                          ? `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`
                          : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}{" "}
                      | {label}
                    </p>
                  </div>
                  <select
                    value={pkg.status}
                    onChange={(event) =>
                      updatePackageStatus(pkg, event.target.value as SignaturePackageStatus)
                    }
                    className="h-11 rounded-lg border border-white/10 bg-black px-3 text-sm font-black text-white outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => editPackage(pkg)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePackage(pkg)}
                    className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white transition hover:bg-red-400"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}

          {filteredPackages.length === 0 && (
            <p className="rounded-lg border border-white/10 bg-white/[0.06] p-8 text-center text-zinc-300">
              No signature packages found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
