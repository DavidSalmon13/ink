package app.ink.api.auth;

import java.util.UUID;

/** The authenticated caller: which owner, and which device session the token belongs to. */
public record OwnerPrincipal(UUID ownerId, UUID sessionId) {
}
