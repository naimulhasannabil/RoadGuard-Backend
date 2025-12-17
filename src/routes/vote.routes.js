import { Router } from "express";
import prisma from "../config/prisma.js";
import {
  VERIFICATION_THRESHOLD,
  CONTRIBUTION_POINTS,
  SOCKET_EVENTS,
} from "../config/constants.js";
import { updateUserLevel } from "../services/user.service.js";
import { authenticate } from "../middleware/auth.middleware.js";

const checkAndUpdateVerification = async (alertId, io) => {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: {
      id: true,
      upvotes: true,
      downvotes: true,
      isVerified: true,
      reporterId: true,
    },
  });

  if (!alert || alert.isVerified) return;

  const totalVotes = alert.upvotes + alert.downvotes;
  const upvoteRatio = totalVotes > 0 ? alert.upvotes / totalVotes : 0;

  if (
    alert.upvotes >= VERIFICATION_THRESHOLD.MIN_UPVOTES &&
    upvoteRatio >= VERIFICATION_THRESHOLD.MIN_VOTE_RATIO
  ) {
    const verifiedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: { isVerified: true, status: "VERIFIED", verifiedAt: new Date() },
      include: {
        images: true,
        reporter: { select: { id: true, name: true, level: true } },
      },
    });

    await prisma.user.update({
      where: { id: alert.reporterId },
      data: {
        verifiedReports: { increment: 1 },
        contributionScore: { increment: CONTRIBUTION_POINTS.ALERT_VERIFIED },
      },
    });

    await updateUserLevel(alert.reporterId);
    io.emit(SOCKET_EVENTS.ALERT_VERIFIED, verifiedAlert);
  }
};

export const voteAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const { isUpvote } = req.body;
    const io = req.app.get("io");

    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    if (alert.reporterId === req.user.id)
      return res.status(400).json({ error: "Cannot vote on your own alert" });

    const existingVote = await prisma.alertVote.findUnique({
      where: { userId_alertId: { userId: req.user.id, alertId } },
    });

    if (existingVote) {
      if (existingVote.isUpvote !== isUpvote) {
        await prisma.$transaction([
          prisma.alertVote.update({
            where: { id: existingVote.id },
            data: { isUpvote },
          }),
          prisma.alert.update({
            where: { id: alertId },
            data: {
              upvotes: isUpvote ? { increment: 1 } : { decrement: 1 },
              downvotes: isUpvote ? { decrement: 1 } : { increment: 1 },
            },
          }),
        ]);
      } else {
        return res.status(400).json({ error: "Already voted" });
      }
    } else {
      await prisma.$transaction([
        prisma.alertVote.create({
          data: { userId: req.user.id, alertId, isUpvote },
        }),
        prisma.alert.update({
          where: { id: alertId },
          data: {
            upvotes: isUpvote ? { increment: 1 } : undefined,
            downvotes: !isUpvote ? { increment: 1 } : undefined,
          },
        }),
        prisma.user.update({
          where: { id: req.user.id },
          data: {
            contributionScore: { increment: CONTRIBUTION_POINTS.VOTE_CAST },
          },
        }),
      ]);
    }

    await checkAndUpdateVerification(alertId, io);

    const updatedAlert = await prisma.alert.findUnique({
      where: { id: alertId },
      select: {
        id: true,
        upvotes: true,
        downvotes: true,
        isVerified: true,
        status: true,
      },
    });

    io.emit(SOCKET_EVENTS.ALERT_UPDATED, updatedAlert);
    res.json({
      message: isUpvote ? "Upvoted successfully" : "Downvoted successfully",
      alert: updatedAlert,
    });
  } catch (error) {
    next(error);
  }
};

export const removeVote = async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const io = req.app.get("io");

    const existingVote = await prisma.alertVote.findUnique({
      where: { userId_alertId: { userId: req.user.id, alertId } },
    });

    if (!existingVote) return res.status(404).json({ error: "Vote not found" });

    await prisma.$transaction([
      prisma.alertVote.delete({ where: { id: existingVote.id } }),
      prisma.alert.update({
        where: { id: alertId },
        data: {
          upvotes: existingVote.isUpvote ? { decrement: 1 } : undefined,
          downvotes: !existingVote.isUpvote ? { decrement: 1 } : undefined,
        },
      }),
    ]);

    const updatedAlert = await prisma.alert.findUnique({
      where: { id: alertId },
      select: { id: true, upvotes: true, downvotes: true, isVerified: true },
    });

    io.emit(SOCKET_EVENTS.ALERT_UPDATED, updatedAlert);
    res.json({ message: "Vote removed", alert: updatedAlert });
  } catch (error) {
    next(error);
  }
};

export const getVoteStatus = async (req, res, next) => {
  try {
    const { alertId } = req.params;

    const vote = await prisma.alertVote.findUnique({
      where: { userId_alertId: { userId: req.user.id, alertId } },
    });

    res.json({
      hasVoted: !!vote,
      voteType: vote ? (vote.isUpvote ? "upvote" : "downvote") : null,
    });
  } catch (error) {
    next(error);
  }
};

const router = Router();

router.post("/alerts/:alertId/vote", authenticate, voteAlert);
router.delete("/alerts/:alertId/vote", authenticate, removeVote);
router.get("/alerts/:alertId/vote/status", authenticate, getVoteStatus);

export default router;
