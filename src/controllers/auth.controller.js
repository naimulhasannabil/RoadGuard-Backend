import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign(
    { userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name, phone, vehicleType } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        vehicleType: vehicleType || "CAR",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        level: true,
        vehicleType: true,
        createdAt: true,
      },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res
      .status(201)
      .json({
        message: "Registration successful",
        user,
        accessToken,
        refreshToken,
      });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.isBanned)
      return res
        .status(403)
        .json({ error: "Account banned", reason: user.banReason });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword)
      return res.status(401).json({ error: "Invalid credentials" });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        level: user.level,
        vehicleType: user.vehicleType,
        contributionScore: user.contributionScore,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token)
      return res.status(401).json({ error: "Refresh token required" });

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
    }

    try {
      jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      storedToken.userId
    );

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        vehicleType: true,
        level: true,
        contributionScore: true,
        totalReports: true,
        verifiedReports: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { token, email, name, picture } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create new user with Google account
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: picture,
          password: await bcrypt.hash(Math.random().toString(36), 12), // Random password for OAuth users
          vehicleType: "CAR",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          level: true,
          vehicleType: true,
          avatar: true,
          createdAt: true,
        },
      });
    } else {
      // Update existing user
      if (user.isBanned) {
        return res.status(403).json({ error: "Account has been banned" });
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastActiveAt: new Date(),
          avatar: picture || user.avatar,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          level: true,
          vehicleType: true,
          avatar: true,
          createdAt: true,
        },
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      message: "Google authentication successful",
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};
