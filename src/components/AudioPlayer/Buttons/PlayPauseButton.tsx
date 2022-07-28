import { useContext, useState } from 'react';

import { useActor } from '@xstate/react';
import useTranslation from 'next-translate/useTranslation';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import PauseIcon from '../../../../public/icons/pause.svg';
import PlayIcon from '../../../../public/icons/play-arrow.svg';
import { AudioPlayerMachineContext } from '../audioPlayerMachine';
import { triggerPlayAudio } from '../EventTriggers';
import SurahAudioMismatchModal from '../SurahAudioMismatchModal';

import Button, { ButtonShape, ButtonVariant } from 'src/components/dls/Button/Button';
import Spinner, { SpinnerSize } from 'src/components/dls/Spinner/Spinner';
import DataContext from 'src/contexts/DataContext';
import useChapterIdsByUrlPath from 'src/hooks/useChapterId';
import useGetQueryParamOrReduxValue from 'src/hooks/useGetQueryParamOrReduxValue';
import {
  exitRepeatMode,
  loadAndPlayAudioData,
  selectAudioData,
  selectAudioPlayerState,
} from 'src/redux/slices/AudioPlayer/state';
import { getChapterData } from 'src/utils/chapter';
import { withStopPropagation } from 'src/utils/event';
import { logButtonClick } from 'src/utils/eventLogger';
import QueryParam from 'types/QueryParam';

const PlayPauseButton = () => {
  const { t, lang } = useTranslation('common');
  const dispatch = useDispatch();
  const chaptersData = useContext(DataContext);
  const audioService = useContext(AudioPlayerMachineContext);
  const [state, send] = useActor(audioService);

  const { playbackRate } = useSelector(selectAudioPlayerState, shallowEqual);
  const { value: reciterId }: { value: number } = useGetQueryParamOrReduxValue(QueryParam.Reciter);
  const audioData = useSelector(selectAudioData, shallowEqual);
  const currentReadingChapterIds = useChapterIdsByUrlPath(lang);
  const currentAudioChapterId = audioData?.chapterId?.toString();

  const [isMismatchModalVisible, setIsMismatchModalVisible] = useState(false);

  // check if the current audio file matches the current reading chapter
  // continue playing if it matches
  // otherwise, show the mismatch modal
  const onClickPlay = () => {
    logButtonClick('audio_player_play');
    const noReadingChapterIdsFound = currentReadingChapterIds.length === 0; // e.g : homepage
    if (currentReadingChapterIds.includes(currentAudioChapterId) || noReadingChapterIdsFound) {
      triggerPlayAudio(playbackRate);
    } else {
      setIsMismatchModalVisible(true);
    }
  };

  let button;

  if (state.hasTag('loading')) {
    button = (
      <Button
        tooltip={`${t('loading')}...`}
        shape={ButtonShape.Circle}
        variant={ButtonVariant.Ghost}
        isDisabled
      >
        <Spinner size={SpinnerSize.Large} />
      </Button>
    );
  } else if (state.matches('playing.playing')) {
    button = (
      <Button
        tooltip={t('audio.player.pause')}
        shape={ButtonShape.Circle}
        variant={ButtonVariant.Ghost}
        onClick={withStopPropagation(() => send('REQUEST_PAUSE'))}
      >
        <PauseIcon />
      </Button>
    );
  } else if (state.matches('paused')) {
    button = (
      <Button
        tooltip={t('audio.player.play')}
        shape={ButtonShape.Circle}
        variant={ButtonVariant.Ghost}
        onClick={withStopPropagation(() => send('REQUEST_PLAY'))}
        shouldFlipOnRTL={false}
      >
        <PlayIcon />
      </Button>
    );
  }

  const [firstCurrentReadingChapterId] = currentReadingChapterIds; // get the first chapter in this page

  const onStartOverClicked = () => {
    dispatch(exitRepeatMode());
    dispatch(loadAndPlayAudioData({ chapter: Number(firstCurrentReadingChapterId), reciterId }));
    setIsMismatchModalVisible(false);
  };

  const onContinueClicked = () => {
    triggerPlayAudio(playbackRate);
    setIsMismatchModalVisible(false);
  };

  return (
    <>
      {button}
      {JSON.stringify(state.value)}
      <SurahAudioMismatchModal
        isOpen={isMismatchModalVisible}
        currentAudioChapter={
          getChapterData(chaptersData, currentAudioChapterId)?.transliteratedName
        }
        currentReadingChapter={
          getChapterData(chaptersData, firstCurrentReadingChapterId)?.transliteratedName
        }
        onContinue={onContinueClicked}
        onStartOver={onStartOverClicked}
      />
    </>
  );
};

export default PlayPauseButton;
