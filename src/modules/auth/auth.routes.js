// src/modules/auth/auth.routes.js

import { loginHandler, getMeHandler } from "./auth.controller.js";
import * as service from "./auth.service.js";

export default async function authRoutes(fastify, options) {
  fastify.post(
    "/login",
    {
      schema: {
        description: "Login user dengan email & password",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            password: {
              type: "string",
              minLength: 6,
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  accessToken: { type: "string" },
                  refreshToken: { type: "string" },
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      name: { type: "string" },
                      email: { type: "string" },
                      role: { type: "string" },
                      companyId: {
                        type: ["number", "null"],
                      },
                    },
                    required: ["id", "email", "role"],
                  },
                },
                required: [
                  "accessToken",
                  "refreshToken",
                  "user",
                ],
              },
            },
            required: ["success", "message", "data"],
          },
        },
      },
    },
    loginHandler,
  );

  fastify.post("/refresh", async (request, reply) => {
    try {
      const { refreshToken } = request.body;
      const tokens = await service.refreshTokenService(
        refreshToken,
        fastify,
      );

      return reply.code(200).send({
        success: true,
        message: "Token refreshed",
        data: tokens,
      });
    } catch (error) {
      return reply.code(401).send({
        success: false,
        message: error.message,
        errors: [],
      });
    }
  });

  fastify.post("/logout", async (request, reply) => {
    const { refreshToken } = request.body;

    await service.logoutUser(refreshToken);

    return reply.code(200).send({
      success: true,
      message: "Logged out successfully",
      data: {},
    });
  });

  fastify.get(
    "/me",
    {
      preValidation: [fastify.authenticate],
    },
    getMeHandler,
  );
}