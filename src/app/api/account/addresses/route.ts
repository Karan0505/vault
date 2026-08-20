import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { addressInputSchema } from "@/lib/validation/validation";
import {
  getCustomerAddresses,
  createCustomerAddress,
} from "@/lib/account/addresses.server";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const addresses = await getCustomerAddresses(userId);
    return NextResponse.json({ addresses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load addresses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addressInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const address = await createCustomerAddress(userId, parsed.data);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create address";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
