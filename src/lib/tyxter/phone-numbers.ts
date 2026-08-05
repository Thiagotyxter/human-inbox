import { env } from "@/lib/env";
import type { PhoneNumberOption } from "@/lib/app-types";
import { tyxterFetch } from "@/lib/tyxter/client";
import type { TyxterListResponse, TyxterPhoneNumber } from "@/lib/tyxter/types";

const ACTIVE_STATUSES = new Set(["active", "connected", "ready", "verified"]);

function isMessageReady(phoneNumber: TyxterPhoneNumber) {
  if (!phoneNumber.status) {
    return true;
  }

  return ACTIVE_STATUSES.has(phoneNumber.status.toLowerCase());
}

export async function listActivePhoneNumbers() {
  const response = await tyxterFetch<TyxterListResponse<TyxterPhoneNumber>>("/v1/phone-numbers");
  return response.data.filter(isMessageReady);
}

export async function getPhoneNumberOptions(): Promise<PhoneNumberOption[]> {
  const phoneNumbers = await listActivePhoneNumbers();

  return phoneNumbers.map((phoneNumber) => ({
    id: phoneNumber.id,
    label: phoneNumber.display_phone_number ?? phoneNumber.phone_number ?? phoneNumber.id,
    status: phoneNumber.status ?? null,
    display_phone_number: phoneNumber.display_phone_number ?? phoneNumber.phone_number ?? null,
  }));
}

export async function resolveTargetPhoneNumberId(preferredPhoneNumberId?: string | null) {
  const phoneNumbers = await listActivePhoneNumbers();
  const configuredId = preferredPhoneNumberId ?? env.TYXTER_PHONE_NUMBER_ID;

  if (configuredId) {
    const match = phoneNumbers.find((item) => item.id === configuredId);

    if (!match) {
      throw new Error("Configured TYXTER_PHONE_NUMBER_ID is not active or available.");
    }

    return match.id;
  }

  if (phoneNumbers.length === 1) {
    return phoneNumbers[0].id;
  }

  return null;
}
