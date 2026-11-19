#!/bin/sh
exec ffmpeg -nostdin -hide_banner -loglevel error \
  -f x11grab -framerate 15 -video_size 1280x720 -draw_mouse 1 -i :99.0 \
  -an -filter_threads 1 -c:v libx264 -preset ultrafast -tune zerolatency -threads 2 \
  -pix_fmt yuv420p -profile:v baseline -level:v 3.1 \
  -g 6 -keyint_min 6 -sc_threshold 0 -crf 24 -maxrate 2400k -bufsize 1200k \
  -movflags +empty_moov+default_base_moof+frag_keyframe -frag_duration 60000 \
  -flush_packets 1 -f mp4 pipe:1
