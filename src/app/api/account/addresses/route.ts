import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { addressInputSchema } from "@/lib/validation/validation";
import {
  getCustomerAddresses,
  createCustomerAddress,
} from "@/lib/account/addresses.server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let validUserId = user.id;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  if (!dbUser) {
    if (user.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase().trim() },
        select: { id: true },
      });
      if (userByEmail) {
        validUserId = userByEmail.id;
      } else {
        return NextResponse.json({ addresses: [] });
      }
    } else {
      return NextResponse.json({ addresses: [] });
    }
  }

  try {
    const addresses = await getCustomerAddresses(validUserId);
    return NextResponse.json({ addresses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load addresses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Ensure user exists in database to avoid foreign key violations from stale sessions
  let validUserId = user.id;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  if (!dbUser) {
    if (user.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase().trim() },
        select: { id: true },
      });
      if (userByEmail) {
        validUserId = userByEmail.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email.toLowerCase().trim(),
            name: user.name || null,
          },
        });
        validUserId = newUser.id;
      }
    } else {
      return NextResponse.json({ error: "User profile not found in database. Please log in again." }, { status: 401 });
    }
  }

  const body = await request.json();
  const parsed = addressInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const address = await createCustomerAddress(validUserId, parsed.data);
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create address";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
