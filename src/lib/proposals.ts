export const PROPOSAL_STATUSES: Record<string, string> = {
  "1": "ההצעה נפתחה",
  "2": "פסלו טרם יצאו",
  "3": "נפגשו",
  "4": "חתכו לאחר פגישה",
  "5": "התחלנו להפגש",
  "6": "חתכו לאחר תקופה",
  "7": "התארסו",
  "8": "התחתנו",
};

/** Return gender-appropriate text. male=זכר version, female=נקבה version */
export function genderText(
  gender: string | null | undefined,
  male: string,
  female: string
): string {
  if (gender === "נקבה") return female;
  if (gender === "זכר") return male;
  return male; // default to male if unknown
}

export function getStatusLabel(status: string): string {
  return PROPOSAL_STATUSES[status] ?? status;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "1":
      return "bg-sky-50 text-sky-700";
    case "2":
      return "bg-red-50 text-red-700";
    case "3":
      return "bg-amber-50 text-amber-700";
    case "4":
      return "bg-red-50 text-red-700";
    case "5":
      return "bg-purple-50 text-purple-700";
    case "6":
      return "bg-red-50 text-red-700";
    case "7":
      return "bg-emerald-50 text-emerald-700";
    case "8":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
}

export function isTerminalStatus(status: string): boolean {
  return status === "7" || status === "8";
}
