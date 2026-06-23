import * as React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ReplyIcon from '@mui/icons-material/Reply';
import ReplyDialog from './reply';
import dayjs from 'dayjs';
import Chipy from '@/components/Chipy';

interface CommentCardProps {
  comment: {
    id: string;
    author: string;
    avatar: string;
    content: string;
    timestamp: string;
    likes: number;
  };
  onReplySubmit: (parentId: string, content: string) => void;
}

export default function CommentCard({ comment, onReplySubmit }: CommentCardProps) {
  const [liked, setLiked] = React.useState(false);
  const [currentLikes, setCurrentLikes] = React.useState(comment.likes);
  const [replyDialogOpen, setReplyDialogOpen] = React.useState(false);

  const handleLike = () => {
    setLiked(!liked);
    setCurrentLikes((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleOpenReplyDialog = () => {
    setReplyDialogOpen(true);
  };

  const handleCloseReplyDialog = () => {
    setReplyDialogOpen(false);
  };

  const handleSendReply = (replyContent: string) => {
    onReplySubmit(comment.id, replyContent);
    handleCloseReplyDialog();
  };

  return (
    <Box sx={{ width:"100%" }}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar src={comment.avatar} alt={comment.author} />
            <Typography variant="subtitle1" fontWeight="bold">
              {comment.author.split(' ')[1]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <Chipy s={dayjs(comment.timestamp).format("HH:mm - DD/MM/YY")} />
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ ml:6 }}>
            {comment.content}
          </Typography>
        </CardContent>
        <CardActions sx={{ml:5 }}>
          <IconButton
            aria-label="like comment"
            onClick={handleLike}
            sx={{borderRadius:9,border:"none"}}
          >
            <ThumbUpAltIcon fontSize="small"  color={liked ? 'primary' : 'inherit'} />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>
            {currentLikes}
          </Typography>
          <Button
            size="small"
            startIcon={<ReplyIcon />}
            onClick={handleOpenReplyDialog}
            sx={{ marginLeft: 1 }}
          >
            Reply
          </Button>
        </CardActions>
      </Card>

      <ReplyDialog
        open={replyDialogOpen}
        onClose={handleCloseReplyDialog}
        commentId={comment.id}
        commentAuthor={comment.author}
        onSendReply={handleSendReply}
      />
    </Box>
  );
}