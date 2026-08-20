import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  setDefaultCustomerAddress,
  AddressNotFoundError,
} from "@/lib/account/addresses.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const address = await setDefaultCustomerAddress(userId, id);
    return NextResponse.json({ address });
  } catch (error) {
    if (error instanceof AddressNotFoundError) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to set default address";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
