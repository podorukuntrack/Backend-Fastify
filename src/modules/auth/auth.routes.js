import { loginHandler, getMeHandler, registerHandler, requestOtpHandler, verifyOtpHandler, resetPasswordHandler, changePasswordHandler, googleLoginHandler, updateProfileHandler, appleLoginHandler, deleteAccountHandler } from "./auth.controller.js";
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
                required: ["user"],
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
    "/google-login",
    {
      schema: {
        description: "Login/Register customer dengan Google ID Token",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["idToken"],
          properties: {
            idToken: { type: "string" },
          },
        },
      },
    },
    googleLoginHandler,
  );

  fastify.post(
    "/apple-login",
    {
      schema: {
        description: "Login/Register customer dengan Apple ID Token",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["idToken"],
          properties: {
            idToken: { type: "string" },
            fullName: { type: "string" },
          },
        },
      },
    },
    appleLoginHandler,
  );

  fastify.post(
    "/refresh",
    {
      schema: {
        description: "Refresh access token",
        tags: ["Auth"],
        body: {
          type: "object",
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
    try {
      const refreshToken = request.cookies?.refreshToken || request.body?.refreshToken;
      if (!refreshToken) {
        throw new Error("Refresh token required");
      }
      const tokens = await service.refreshTokenService(
        refreshToken,
        fastify,
      );

      reply.setCookie('accessToken', tokens.accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60
      });

      reply.setCookie('refreshToken', tokens.refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60
      });

      return reply.code(200).send({
        success: true,
        message: "Token refreshed",
        data: { 
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: tokens.user 
        },
      });
    } catch (error) {
    throw error;
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
          properties: {
            refreshToken: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
    const refreshToken = request.cookies?.refreshToken || request.body?.refreshToken;

    if (refreshToken) {
      await service.logoutUser(refreshToken);
    }

    const cookieOpts = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };

    reply.clearCookie('accessToken', cookieOpts);
    reply.clearCookie('refreshToken', cookieOpts);

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
    "/forgot-password/request-otp",
    {
      schema: {
        description: "Minta OTP untuk Lupa Password (via WA/Email)",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["method", "contact"],
          properties: {
            method: { type: "string", enum: ["wa", "email"] },
            contact: { type: "string" },
          },
        },
      },
    },
    requestOtpHandler
  );

  fastify.post(
    "/forgot-password/verify-otp",
    {
      schema: {
        description: "Verifikasi OTP Lupa Password",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["contact", "otp"],
          properties: {
            contact: { type: "string" },
            otp: { type: "string", minLength: 6, maxLength: 6 },
          },
        },
      },
    },
    verifyOtpHandler
  );

  fastify.post(
    "/forgot-password/reset",
    {
      schema: {
        description: "Reset Password dengan Token",
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["contact", "resetToken", "newPassword"],
          properties: {
            contact: { type: "string" },
            resetToken: { type: "string" },
            newPassword: { type: "string", minLength: 6 },
          },
        },
      },
    },
    resetPasswordHandler
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

  fastify.patch(
    "/profile",
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: "Update Profil Pengguna (Nama & Nomor Telepon)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            nama: { type: "string" },
            nomorTelepon: { type: "string" },
          },
        },
      },
    },
    updateProfileHandler
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
    throw error;
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
    throw error;
  }
    },
  );

  fastify.delete(
    "/account",
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: "Hapus akun pengguna secara permanen (anonymize)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
      },
    },
    deleteAccountHandler,
  );
}