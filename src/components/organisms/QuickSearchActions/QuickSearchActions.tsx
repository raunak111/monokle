import React, {useEffect, useMemo, useRef, useState} from 'react';

import {Input, Modal} from 'antd';

import {SearchOutlined} from '@ant-design/icons';

import styled from 'styled-components';

import {useAppDispatch, useAppSelector} from '@redux/hooks';
import {closeQuickSearchActionsPopup} from '@redux/reducers/ui';

import {useNamespaces} from '@hooks/useNamespaces';

import Colors from '@styles/Colors';

import {ResourceKindHandlers} from '@src/kindhandlers';

import {LabelTypes, optionsTypes} from './LabelMapper';
import QuickSearchActionsOptionsGroup from './QuickSearchActionsOptionsGroup';

const MainContainer = styled.div`
  padding: 8px 0px;

  & .ant-input-group-addon {
    background: transparent;
  }
`;

const NotFoundLabel = styled.div`
  padding: 12px 20px 4px 20px;
  color: ${Colors.grey7};
`;

const OptionsContainer = styled.div`
  margin-top: 12px;
`;

const InputContainer = styled.div`
  padding: 0 8px;

  & .ant-input-suffix {
    transition: all 0.3s;
    cursor: pointer;
  }

  & .ant-input-affix-wrapper:hover .ant-input-suffix {
    border-color: #165996;
  }

  & .ant-input-affix-wrapper-focused .ant-input-suffix {
    border-left-color: #177ddc;
  }
`;

const StyledInput = styled(Input)`
  padding: 0px 0px 0px 12px;

  & .ant-input-suffix {
    color: ${Colors.grey450};
    font-size: 16px;
    border-left: 1px solid #434343;
    padding: 7px;
  }
`;

const GROUP_OPTIONS_LIMIT = 4;

const KnownResourceKinds = ResourceKindHandlers.map(kindHandler => kindHandler.kind);

const QuickSearchActions: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(state => state.ui.quickSearchActionsPopup.isOpen);
  const resourceMap = useAppSelector(state => state.main.resourceMap);

  const [namespaces] = useNamespaces({extra: ['default']});

  const [filteredOptions, setFilteredOptions] = useState<{namespace: string[]; kind: string[]}>();
  const [searchingValue, setSearchingValue] = useState<string>('');

  const searchInputRef = useRef<any>();

  const allResourceKinds = useMemo(() => {
    return [
      ...new Set([
        ...KnownResourceKinds,
        ...Object.values(resourceMap)
          .filter(r => !KnownResourceKinds.includes(r.kind))
          .map(r => r.kind),
      ]),
    ].sort();
  }, [resourceMap]);

  const foundOptions = useMemo(
    () => (filteredOptions ? Object.values(filteredOptions).some(options => options.length > 0) : false),
    [filteredOptions]
  );

  const closeModalHandler = () => {
    setFilteredOptions(undefined);
    setSearchingValue('');
    dispatch(closeQuickSearchActionsPopup());
  };

  useEffect(() => {
    if (!searchingValue && !filteredOptions) {
      return;
    }

    if (!searchingValue && filteredOptions) {
      setFilteredOptions(undefined);
      return;
    }

    const filteredKinds = allResourceKinds
      .filter(kind => kind.toLowerCase().startsWith(searchingValue))
      .slice(0, GROUP_OPTIONS_LIMIT);
    const filteredNamespaces = namespaces
      .filter(ns => ns.toLowerCase().startsWith(searchingValue))
      .slice(0, GROUP_OPTIONS_LIMIT);

    setFilteredOptions({namespace: filteredNamespaces, kind: filteredKinds});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchingValue]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current.focus(), 0);
    }
  }, [isOpen]);

  return (
    <Modal footer={null} bodyStyle={{padding: '0px'}} closable={false} visible={isOpen} onCancel={closeModalHandler}>
      <MainContainer>
        <InputContainer>
          <StyledInput
            placeholder="Search by namespace, kind and resource"
            ref={searchInputRef}
            suffix={<SearchOutlined />}
            value={searchingValue}
            onChange={e => setSearchingValue(e.target.value.toLowerCase())}
          />
        </InputContainer>

        {filteredOptions ? (
          foundOptions ? (
            <OptionsContainer>
              {Object.entries(filteredOptions)
                .filter((entry): entry is [LabelTypes, string[]] => optionsTypes.includes(entry[0]))
                .map(([key, value]) => (
                  <QuickSearchActionsOptionsGroup
                    key={key}
                    type={key}
                    options={value}
                    onOptionClick={closeModalHandler}
                  />
                ))}
            </OptionsContainer>
          ) : (
            <NotFoundLabel>No namespace, kind or resource found.</NotFoundLabel>
          )
        ) : null}
      </MainContainer>
    </Modal>
  );
};

export default QuickSearchActions;
