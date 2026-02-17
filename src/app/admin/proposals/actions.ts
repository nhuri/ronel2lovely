"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTerminalStatus } from "@/lib/proposals";

export type ProposalActionResult = {
  error?: string;
  success?: boolean;
};

/** Verify the current user is an admin */
async function verifyAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role === "candidate") {
    return null;
  }

  return supabase;
}

export async function createProposal(
  candidateId1: number,
  candidateId2: number,
  notes?: string
): Promise<ProposalActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה לבצע פעולה זו" };

  if (candidateId1 === candidateId2) {
    return { error: "לא ניתן ליצור הצעה עם אותו מועמד פעמיים" };
  }

  // Validate both candidates exist and are active
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, availability_status")
    .in("id", [candidateId1, candidateId2]);

  if (!candidates || candidates.length !== 2) {
    return { error: "אחד המועמדים או שניהם לא נמצאו" };
  }

  for (const c of candidates) {
    if (c.availability_status === "הקפאה" || c.availability_status === "התחתנו") {
      return { error: "אחד המועמדים מוקפא או נשוי ולא ניתן ליצור עבורו הצעה" };
    }
  }

  // Check for duplicate proposal (either direction)
  const { data: existing } = await supabase
    .from("proposals")
    .select("id")
    .or(
      `and(candidate_id_1.eq.${candidateId1},candidate_id_2.eq.${candidateId2}),and(candidate_id_1.eq.${candidateId2},candidate_id_2.eq.${candidateId1})`
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { error: "כבר קיימת הצעת שידוך עבור זוג זה" };
  }

  const { error } = await supabase.from("proposals").insert({
    candidate_id_1: candidateId1,
    candidate_id_2: candidateId2,
    status: "1",
    notes: notes?.trim() || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateProposalStatus(
  proposalId: number,
  newStatus: string
): Promise<ProposalActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה לבצע פעולה זו" };

  // Fetch current proposal
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, candidate_id_1, candidate_id_2, status")
    .eq("id", proposalId)
    .maybeSingle();

  if (!proposal) return { error: "ההצעה לא נמצאה" };

  // Update status
  const { error } = await supabase
    .from("proposals")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return { error: error.message };

  // Auto-freeze: if status is 7 (engaged) or 8 (married), update both candidates
  if (isTerminalStatus(newStatus)) {
    const statusLabel = newStatus === "7" ? "התארסו" : "התחתנו";
    await supabase
      .from("candidates")
      .update({ availability_status: statusLabel })
      .in("id", [proposal.candidate_id_1, proposal.candidate_id_2]);
  }

  return { success: true };
}

export async function updateProposalNotes(
  proposalId: number,
  notes: string
): Promise<ProposalActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה לבצע פעולה זו" };

  const { error } = await supabase
    .from("proposals")
    .update({
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function addProposalNote(
  proposalId: number,
  noteText: string,
  authorType: string = "admin"
): Promise<ProposalActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה לבצע פעולה זו" };

  const trimmed = noteText.trim();
  if (!trimmed) return { error: "תוכן ההערה ריק" };

  const { error } = await supabase.from("proposal_notes").insert({
    proposal_id: proposalId,
    note_text: trimmed,
    author_type: authorType,
  });

  if (error) return { error: error.message };

  // Update proposal updated_at
  await supabase
    .from("proposals")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", proposalId);

  return { success: true };
}

export async function deleteProposal(
  proposalId: number
): Promise<ProposalActionResult> {
  const supabase = await verifyAdmin();
  if (!supabase) return { error: "אין הרשאה לבצע פעולה זו" };

  const { error } = await supabase
    .from("proposals")
    .delete()
    .eq("id", proposalId);

  if (error) return { error: error.message };
  return { success: true };
}
