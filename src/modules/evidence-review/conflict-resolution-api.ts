import { z } from "zod";

const schema = z.object({
  claimKey: z.string().min(1),
  selectedEvidenceId: z.string().uuid(),
  rationale: z.string().trim().min(1),
});
type Actor = { synthetic: boolean; role: string };

export function createConflictResolutionApiHandlers<
  ActorType extends Actor,
>(dependencies: {
  resolveActor: () => Promise<ActorType | null>;
  resolve: (
    actor: ActorType,
    input: z.infer<typeof schema>,
  ) => Promise<unknown>;
}) {
  return {
    async resolve(request: Request) {
      const actor = await dependencies.resolveActor();
      if (!actor)
        return Response.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      if (
        actor.synthetic ||
        !["owner", "admin", "transformation_lead", "analyst"].includes(
          actor.role,
        )
      )
        return Response.json(
          { error: "Conflict resolution is not permitted" },
          { status: 403 },
        );
      const parsed = schema.safeParse(await request.json().catch(() => null));
      if (!parsed.success)
        return Response.json(
          { error: "Invalid conflict resolution" },
          { status: 400 },
        );
      try {
        return Response.json(await dependencies.resolve(actor, parsed.data), {
          status: 201,
        });
      } catch (error) {
        return Response.json(
          {
            error: error instanceof Error ? error.message : "Resolution failed",
          },
          { status: 409 },
        );
      }
    },
  };
}
