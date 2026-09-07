import { z } from "zod";

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("accepted"),
    rationale: z.string().trim().min(1),
  }),
  z.object({
    decision: z.literal("rejected"),
    rationale: z.string().trim().min(1),
  }),
  z.object({
    decision: z.literal("edited"),
    rationale: z.string().trim().min(1),
    editedValue: z.unknown(),
  }),
]);

type ReviewInput = z.infer<typeof reviewSchema> & { candidateId: string };

export function createEvidenceReviewApiHandlers<
  Actor extends { userId: string; synthetic?: boolean; role?: string },
>(dependencies: {
  resolveActor: () => Promise<Actor | null>;
  createService: (actor: Actor) => {
    review(input: ReviewInput): Promise<unknown>;
  };
}) {
  return {
    async review(candidateId: string, request: Request) {
      const actor = await dependencies.resolveActor();
      if (!actor)
        return Response.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      if (
        actor.synthetic ||
        (actor.role !== undefined &&
          !["owner", "admin", "transformation_lead", "analyst"].includes(
            actor.role,
          ))
      ) {
        return Response.json(
          { error: "Evidence review is not permitted" },
          { status: 403 },
        );
      }
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }
      const parsed = reviewSchema.safeParse(body);
      if (!parsed.success || !candidateId) {
        return Response.json({ error: "Invalid review" }, { status: 400 });
      }
      try {
        const result = await dependencies
          .createService(actor)
          .review({ candidateId, ...parsed.data });
        return Response.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Review failed";
        return Response.json({ error: message }, { status: 409 });
      }
    },
  };
}
