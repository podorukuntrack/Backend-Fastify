// src/modules/auth/auth.routes.js

import { loginHandler, getMeHandler, registerHandler, forgotPasswordHandler, changePasswordHandler } from "./auth.controller.js";
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
                      id: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string" },
                      role: { type: "string" },
                      companyId: {
                        type: ["string", "null"],
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

  fastify.post(
    "/register",
    {
      schema: {
        description: "Registrasi customer baru (Mobile)",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["nama", "email", "password"],
          properties: {
            nama: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
            nomorTelepon: { type: "string" },
            companyId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    registerHandler,
  );

  fastify.post(
    "/refresh",
    {
      schema: {
        description: "Refresh access token",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
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

  fastify.post(
    "/logout",
    {
      schema: {
        description: "Logout user",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
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

  fastify.post(
    "/forgot-password",
    {
      schema: {
        description: "Lupa Password (dikirim via WhatsApp)",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
          },
        },
      },
    },
    forgotPasswordHandler
  );

  fastify.post(
    "/change-password",
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: "Ganti Password",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["oldPassword", "newPassword"],
          properties: {
            oldPassword: { type: "string" },
            newPassword: { type: "string", minLength: 6 },
          },
        },
      },
    },
    changePasswordHandler
  );

  fastify.post(
    "/fcm-token",
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: "Update FCM token for push notifications",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["fcmToken"],
          properties: {
            fcmToken: { type: "string" },
            deviceType: { type: "string", enum: ["android", "ios"] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { fcmToken, deviceType } = request.body;
        const result = await service.registerDeviceToken(
          request.user.sub,
          fcmToken,
          deviceType,
        );
        return reply.code(200).send({
          success: true,
          message: "FCM token updated",
          data: result,
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: error.message,
        });
      }
    },
  );

  fastify.delete(
    "/fcm-token",
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: "Unregister FCM token on logout",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["fcmToken"],
          properties: {
            fcmToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { fcmToken } = request.body;
        await service.unregisterDeviceToken(request.user.sub, fcmToken);
        return reply.code(200).send({
          success: true,
          message: "FCM token unregistered successfully",
          data: {},
        });
      } catch (error) {
        return reply.code(500).send({
          success: false,
          message: error.message,
        });
      }
    },
  );
}