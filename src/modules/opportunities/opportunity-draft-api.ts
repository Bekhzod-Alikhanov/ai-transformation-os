import { z } from "zod";

const transitionSchema = z.object({
  action: z.enum(["merge", "reject", "promote"]),
  expectedVersion: z.number().int().positive(),
  targetUseCaseId: z.string().min(1).optional(),
});
const editSchema = z.object({
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1),
  problemStatement: z.string().trim().min(1),
  businessUnit: z.string().trim().min(1).nullable(),
  evidenceIds: z.array(z.string().uuid()).min(1),
});

type BaseActor = {
  userId: string;
  synthetic: boolean;
  role: string;
};

function canManageDrafts(actor: BaseActor) {
  return ["owner", "admin", "transformation_lead", "analyst"].includes(
    actor.role,
  );
}

export function createOpportunityDraftApiHandlers<
  Actor extends BaseActor,
>(dependencies: {
  resolveActor: () => Promise<Actor | null>;
  createService: (actor: Actor) => {
    mine(): Promise<unknown>;
    transition(input: {
      draftId: string;
      action: "merge" | "reject" | "promote";
      expectedVersion: number;
      targetUseCaseId?: string;
    }): Promise<unknown>;
    update(
      input: z.infer<typeof editSchema> & { draftId: string },
    ): Promise<unknown>;
  };
}) {
  async function actorOrForbidden(): Promise<
    { actor: Actor } | { response: Response }
  > {
    const actor = await dependencies.resolveActor();
    if (!actor)
      return {
        response: Response.json(
          { error: "Authentication required" },
          { status: 401 },
        ),
      };
    if (actor.synthetic || !canManageDrafts(actor)) {
      return {
        response: Response.json(
          { error: "Draft management is not permitted" },
          { status: 403 },
        ),
      };
    }
    return { actor };
  }

  return {
    async mine() {
      const resolved = await actorOrForbidden();
      if ("response" in resolved) return resolved.response;
      try {
        return Response.json(
          await dependencies.createService(resolved.actor).mine(),
          {
            status: 201,
          },
        );
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Opportunity mining failed",
          },
          { status: 409 },
        );
      }
    },
    async transition(draftId: string, request: Request) {
      const resolved = await actorOrForbidden();
      if ("response" in resolved) return resolved.response;
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      const parsed = transitionSchema.safeParse(body);
      if (!parsed.success || !draftId) {
        return Response.json(
          { error: "Invalid draft transition" },
          { status: 400 },
        );
      }
      if (parsed.data.action === "merge" && !parsed.data.targetUseCaseId) {
        return Response.json(
          { error: "Merge requires a target use case" },
          { status: 400 },
        );
      }
      if (parsed.data.action === "reject" && parsed.data.targetUseCaseId) {
        return Response.json(
          { error: "Rejected drafts cannot have a target use case" },
          { status: 400 },
        );
      }
      try {
        return Response.json(
          await dependencies
            .createService(resolved.actor)
            .transition({ draftId, ...parsed.data }),
        );
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Draft transition failed",
          },
          { status: 409 },
        );
      }
    },
    async edit(draftId: string, request: Request) {
      const resolved = await actorOrForbidden();
      if ("response" in resolved) return resolved.response;
      const parsed = editSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success || !draftId) {
        return Response.json({ error: "Invalid draft edit" }, { status: 400 });
      }
      try {
        return Response.json(
          await dependencies.createService(resolved.actor).update({
            draftId,
            ...parsed.data,
          }),
        );
      } catch (error) {
        return Response.json(
          {
            error: error instanceof Error ? error.message : "Draft edit failed",
          },
          { status: 409 },
        );
      }
    },
  };
}
